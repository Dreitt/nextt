import type {
  API,
  Collection,
  ASTPath,
  ObjectPattern,
  Identifier,
} from 'jscodeshift'
import {
  determineClientDirective,
  generateUniqueIdentifier,
  getFunctionPathFromExportPath,
  insertReactUseImport,
  isFunctionType,
  TARGET_NAMED_EXPORTS,
  TARGET_PROP_NAMES,
  turnFunctionReturnTypeToAsync,
  type FunctionScope,
} from './utils'

const PAGE_PROPS = 'props'

export function transformDynamicProps(
  source: string,
  api: API,
  _filePath: string
) {
  let modified = false
  const j = api.jscodeshift.withParser('tsx')
  const root = j(source)
  // Check if 'use' from 'react' needs to be imported
  let needsReactUseImport = false
  // Based on the prop names
  // e.g. destruct `params` { slug } = params
  // e.g. destruct `searchParams `{ search } = searchParams
  let insertedDestructPropNames = new Set<string>()
  // Rename props to `prop` argument for the function
  let insertedRenamedPropFunctionNames = new Set<string>()

  function processAsyncPropOfEntryFile(isClientComponent: boolean) {
    // find `params` and `searchParams` in file, and transform the access to them
    function renameAsyncPropIfExisted(
      path: ASTPath<FunctionScope>,
      isDefaultExport: boolean
    ) {
      const decl = path.value
      if (
        decl.type !== 'FunctionDeclaration' &&
        decl.type !== 'FunctionExpression' &&
        decl.type !== 'ArrowFunctionExpression'
      ) {
        return
      }

      const params = decl.params
      // target properties mapping, only contains `params` and `searchParams`
      const propertiesMap = new Map<string, any>()
      let allProperties: ObjectPattern['properties'] = []

      // If there's no first param, return
      if (params.length !== 1) {
        return
      }
      const propsIdentifier = generateUniqueIdentifier(PAGE_PROPS, path, j)

      const currentParam = params[0]

      // Argument destructuring case
      if (currentParam.type === 'ObjectPattern') {
        // Validate if the properties are not `params` and `searchParams`,
        // if they are, quit the transformation
        let foundTargetProp = false
        for (const prop of currentParam.properties) {
          if ('key' in prop && prop.key.type === 'Identifier') {
            const propName = prop.key.name
            if (TARGET_PROP_NAMES.has(propName)) {
              foundTargetProp = true
            }
          }
        }

        // If there's no `params` or `searchParams` matched, return
        if (!foundTargetProp) return

        allProperties = currentParam.properties

        currentParam.properties.forEach((prop) => {
          if (
            // Could be `Property` or `ObjectProperty`
            'key' in prop &&
            prop.key.type === 'Identifier' &&
            TARGET_PROP_NAMES.has(prop.key.name)
          ) {
            const value = 'value' in prop ? prop.value : null
            propertiesMap.set(prop.key.name, value)
          }
        })

        const paramTypeAnnotation = currentParam.typeAnnotation
        if (paramTypeAnnotation && paramTypeAnnotation.typeAnnotation) {
          const typeAnnotation = paramTypeAnnotation.typeAnnotation
          if (typeAnnotation.type === 'TSTypeLiteral') {
            const typeLiteral = typeAnnotation

            // Find the type property for `params`
            typeLiteral.members.forEach((member) => {
              if (
                member.type === 'TSPropertySignature' &&
                member.key.type === 'Identifier' &&
                propertiesMap.has(member.key.name)
              ) {
                // if it's already a Promise, don't wrap it again, return
                if (
                  member.typeAnnotation &&
                  member.typeAnnotation.typeAnnotation &&
                  member.typeAnnotation.typeAnnotation.type ===
                    'TSTypeReference' &&
                  member.typeAnnotation.typeAnnotation.typeName.type ===
                    'Identifier' &&
                  member.typeAnnotation.typeAnnotation.typeName.name ===
                    'Promise'
                ) {
                  return
                }

                // Wrap the `params` type in Promise<>
                if (
                  member.typeAnnotation &&
                  member.typeAnnotation.typeAnnotation &&
                  j.TSType.check(member.typeAnnotation.typeAnnotation)
                ) {
                  member.typeAnnotation.typeAnnotation = j.tsTypeReference(
                    j.identifier('Promise'),
                    j.tsTypeParameterInstantiation([
                      // @ts-ignore
                      member.typeAnnotation.typeAnnotation,
                    ])
                  )
                }
              }
            })
          } else if (typeAnnotation.type === 'TSTypeReference') {
            // If typeAnnotation is a type or interface, change the properties to Promise<type of property>
            // e.g. interface PageProps { params: { slug: string } } => interface PageProps { params: Promise<{ slug: string }> }
            const typeReference = typeAnnotation
            if (typeReference.typeName.type === 'Identifier') {
              // Find the actual type of the type reference
              const foundTypes = findAllTypes(
                root,
                j,
                typeReference.typeName.name
              )

              // Deal with interfaces
              if (foundTypes.interfaces.length > 0) {
                const interfaceDeclaration = foundTypes.interfaces[0]
                if (
                  interfaceDeclaration.type === 'TSInterfaceDeclaration' &&
                  interfaceDeclaration.body?.type === 'TSInterfaceBody'
                ) {
                  const typeBody = interfaceDeclaration.body.body
                  // if it's already a Promise, don't wrap it again, return
                  // traverse the typeReference's properties, if any is in propNames, wrap it in Promise<> if needed
                  typeBody.forEach((member) => {
                    if (
                      member.type === 'TSPropertySignature' &&
                      member.key.type === 'Identifier' &&
                      TARGET_PROP_NAMES.has(member.key.name)
                    ) {
                      // if it's already a Promise, don't wrap it again, return
                      if (
                        member.typeAnnotation &&
                        member.typeAnnotation.typeAnnotation &&
                        member.typeAnnotation?.typeAnnotation?.typeName
                          ?.name === 'Promise'
                      ) {
                        return
                      }

                      // Wrap the prop type in Promise<>
                      if (
                        member.typeAnnotation &&
                        member.typeAnnotation.typeAnnotation &&
                        // check if member name is in propNames
                        TARGET_PROP_NAMES.has(member.key.name)
                      ) {
                        member.typeAnnotation.typeAnnotation =
                          j.tsTypeReference(
                            j.identifier('Promise'),
                            j.tsTypeParameterInstantiation([
                              member.typeAnnotation.typeAnnotation,
                            ])
                          )
                      }
                    }
                  })
                }
              }
            }
          }

          propsIdentifier.typeAnnotation = paramTypeAnnotation
        }

        // Override the first param to `props`
        params[0] = propsIdentifier

        modified = true
      }

      if (modified) {
        resolveAsyncProp(
          path,
          propertiesMap,
          propsIdentifier.name,
          allProperties,
          isDefaultExport
        )
      }
    }

    // Helper function to insert `const params = await asyncParams;` at the beginning of the function body
    function resolveAsyncProp(
      path: ASTPath<FunctionScope>,
      propertiesMap: Map<string, Identifier | ObjectPattern | undefined>,
      propsIdentifierName: string,
      allProperties: ObjectPattern['properties'],
      isDefaultExport: boolean
    ) {
      const node = path.value

      // If it's sync default export, and it's also server component, make the function async
      if (isDefaultExport && !isClientComponent) {
        if (!node.async) {
          if ('async' in node) {
            node.async = true
            turnFunctionReturnTypeToAsync(node, j)
          }
        }
      }

      const isAsyncFunc = !!node.async
      const functionName = path.value.id?.name || 'default'
      let functionBody: any = node.body
      if (functionBody && functionBody.type === 'BlockStatement') {
        functionBody = functionBody.body
      }
      // getBodyOfFunctionDeclaration(functionPath)

      const hasOtherProperties = allProperties.length > propertiesMap.size

      function createDestructuringDeclaration(
        properties: ObjectPattern['properties'],
        destructPropsIdentifierName: string
      ) {
        const propsToKeep = []
        let restProperty = null

        // Iterate over the destructured properties
        properties.forEach((property) => {
          if (j.ObjectProperty.check(property)) {
            // Handle normal and computed properties
            const keyName = j.Identifier.check(property.key)
              ? property.key.name
              : j.Literal.check(property.key)
                ? property.key.value
                : null // for computed properties

            if (typeof keyName === 'string') {
              propsToKeep.push(property)
            }
          } else if (j.RestElement.check(property)) {
            restProperty = property
          }
        })

        if (propsToKeep.length === 0 && !restProperty) {
          return null
        }

        if (restProperty) {
          propsToKeep.push(restProperty)
        }

        return j.variableDeclaration('const', [
          j.variableDeclarator(
            j.objectPattern(propsToKeep),
            j.identifier(destructPropsIdentifierName)
          ),
        ])
      }

      if (hasOtherProperties) {
        /**
         * If there are other properties, we need to keep the original param with destructuring
         * e.g.
         * input:
         * Page({ params: { slug }, otherProp }) {
         *   const { slug } = await props.params;
         * }
         *
         * output:
         * Page(props) {
         *   const { otherProp } = props; // inserted
         *   // ...rest of the function body
         * }
         */
        const restProperties = allProperties.filter((prop) => {
          const isTargetProps =
            'key' in prop &&
            prop.key.type === 'Identifier' &&
            TARGET_PROP_NAMES.has(prop.key.name)
          return !isTargetProps
        })
        const destructionOtherPropertiesDeclaration =
          createDestructuringDeclaration(restProperties, propsIdentifierName)
        if (functionBody && destructionOtherPropertiesDeclaration) {
          functionBody.unshift(destructionOtherPropertiesDeclaration)
        }
      }

      for (const [matchedPropName, paramsProperty] of propertiesMap) {
        if (!TARGET_PROP_NAMES.has(matchedPropName)) {
          continue
        }

        const propRenamedId = j.Identifier.check(paramsProperty)
          ? paramsProperty.name
          : null
        const propName = propRenamedId || matchedPropName

        // if propName is not used in lower scope, and it stars with unused prefix `_`,
        // also skip the transformation
        const hasDeclared = path.scope.declares(propName)
        if (!hasDeclared && propName.startsWith('_')) continue

        const propNameIdentifier = j.identifier(matchedPropName)
        const propsIdentifier = j.identifier(propsIdentifierName)
        const accessedPropId = j.memberExpression(
          propsIdentifier,
          propNameIdentifier
        )

        // Check param property value, if it's destructed, we need to destruct it as well
        // e.g.
        // input: Page({ params: { slug } })
        // output: const { slug } = await props.params; rather than const props = await props.params;
        const uid = functionName + ':' + propName

        if (paramsProperty?.type === 'ObjectPattern') {
          const objectPattern = paramsProperty
          const objectPatternProperties = objectPattern.properties

          // destruct the object pattern, e.g. { slug } => const { slug } = params;
          const destructedObjectPattern = j.variableDeclaration('const', [
            j.variableDeclarator(
              j.objectPattern(
                objectPatternProperties.map((prop) => {
                  if (
                    prop.type === 'Property' &&
                    prop.key.type === 'Identifier'
                  ) {
                    return j.objectProperty(
                      j.identifier(prop.key.name),
                      j.identifier(prop.key.name)
                    )
                  }
                  return prop
                })
              ),
              propNameIdentifier
            ),
          ])

          if (!insertedDestructPropNames.has(uid) && functionBody) {
            functionBody.unshift(destructedObjectPattern)
            insertedDestructPropNames.add(uid)
          }
        }

        if (isAsyncFunc) {
          // If it's async function, add await to the async props.<propName>
          const paramAssignment = j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier(propName),
              j.awaitExpression(accessedPropId)
            ),
          ])
          if (!insertedRenamedPropFunctionNames.has(uid) && functionBody) {
            functionBody.unshift(paramAssignment)
            insertedRenamedPropFunctionNames.add(uid)
          }
        } else {
          // const isFromExport = true
          if (!isClientComponent) {
            // If it's export function, populate the function to async
            if (
              isFunctionType(node.type) &&
              // Make TS happy
              'async' in node
            ) {
              node.async = true
              turnFunctionReturnTypeToAsync(node, j)

              // Insert `const <propName> = await props.<propName>;` at the beginning of the function body
              const paramAssignment = j.variableDeclaration('const', [
                j.variableDeclarator(
                  j.identifier(propName),
                  j.awaitExpression(accessedPropId)
                ),
              ])
              if (!insertedRenamedPropFunctionNames.has(uid) && functionBody) {
                functionBody.unshift(paramAssignment)
                insertedRenamedPropFunctionNames.add(uid)
              }
            }
          } else {
            const paramAssignment = j.variableDeclaration('const', [
              j.variableDeclarator(
                j.identifier(propName),
                j.callExpression(j.identifier('use'), [accessedPropId])
              ),
            ])
            if (!insertedRenamedPropFunctionNames.has(uid) && functionBody) {
              needsReactUseImport = true
              functionBody.unshift(paramAssignment)
              insertedRenamedPropFunctionNames.add(uid)
            }
          }
        }
      }
    }

    const defaultExportsDeclarations = root.find(j.ExportDefaultDeclaration)

    defaultExportsDeclarations.forEach((path) => {
      const functionPath = getFunctionPathFromExportPath(
        path,
        j,
        root,
        () => true
      )
      if (functionPath) {
        renameAsyncPropIfExisted(functionPath, true)
      }
    })

    // Matching Next.js functional named export of route entry:
    // - export function <named>(...) { ... }
    // - export const <named> = ...
    const namedExportDeclarations = root.find(j.ExportNamedDeclaration)

    namedExportDeclarations.forEach((path) => {
      const functionPath = getFunctionPathFromExportPath(
        path,
        j,
        root,
        (idName) => TARGET_NAMED_EXPORTS.has(idName)
      )

      if (functionPath) {
        renameAsyncPropIfExisted(functionPath, false)
      }
    })
  }

  const isClientComponent = determineClientDirective(root, j, source)

  // Apply to `params` and `searchParams`
  processAsyncPropOfEntryFile(isClientComponent)

  // Add import { use } from 'react' if needed and not already imported
  if (needsReactUseImport) {
    insertReactUseImport(root, j)
  }

  return modified ? root.toSource() : null
}

function findAllTypes(
  root: Collection<any>,
  j: API['jscodeshift'],
  typeName: string
) {
  const types = {
    interfaces: [],
    typeAliases: [],
    imports: [],
    references: [],
  }

  // Step 1: Find all interface declarations with the specified name
  root
    .find(j.TSInterfaceDeclaration, {
      id: {
        type: 'Identifier',
        name: typeName,
      },
    })
    .forEach((path) => {
      types.interfaces.push(path.node)
    })

  // Step 2: Find all type alias declarations with the specified name
  root
    .find(j.TSTypeAliasDeclaration, {
      id: {
        type: 'Identifier',
        name: typeName,
      },
    })
    .forEach((path) => {
      types.typeAliases.push(path.node)
    })

  // Step 3: Find all imported types with the specified name
  root
    .find(j.ImportSpecifier, {
      imported: {
        type: 'Identifier',
        name: typeName,
      },
    })
    .forEach((path) => {
      types.imports.push(path.node)
    })

  // Step 4: Find all references to the specified type
  root
    .find(j.TSTypeReference, {
      typeName: {
        type: 'Identifier',
        name: typeName,
      },
    })
    .forEach((path) => {
      types.references.push(path.node)
    })

  return types
}

const rule = require('../../../lib/rules/no-css-tags')
const RuleTester = require('eslint').RuleTester

RuleTester.setDefaultConfig({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
      jsx: true,
    },
  },
})

var ruleTester = new RuleTester()
ruleTester.run('no-css-tags', rule, {
  valid: [
    `import {Head} from 'next/document';

      export class Blah extends Head {
        render() {
          return (
            <div>
              <h1>Hello title</h1>
            </div>
          );
        }
    }`,
  ],

  invalid: [
    {
      code: `
      import {Head} from 'next/document';

        export class Blah extends Head {
          render() {
            return (
              <div>
                <h1>Hello title</h1>
                <link href="/_next/static/css/styles.css" rel="stylesheet" />
              </div>
            );
          }
      }`,
      errors: [
        {
          message:
            'In order to use external stylesheets use @import in the root stylesheet compiled with NextJS. This ensures proper priority to CSS when loading a webpage.',
          type: 'JSXOpeningElement',
        },
      ],
    },
    {
      code: `
      <div>
        <link href="/_next/static/css/styles.css" rel="stylesheet" />
      </div>`,
      errors: [
        {
          message:
            'In order to use external stylesheets use @import in the root stylesheet compiled with NextJS. This ensures proper priority to CSS when loading a webpage.',
          type: 'JSXOpeningElement',
        },
      ],
    },
  ],
})

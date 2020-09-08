import { User } from '../../interfaces'
import { sampleUserData } from '../../utils/sample-data'

const navigationLinks = [
  {
    label: 'Home',
    link: '/',
  },
  {
    label: 'About',
    link: '/about',
  },
  {
    label: 'Users List',
    link: '/users',
  },
  {
    label: 'Users API',
    link: '/api/users',
  },
]

describe('App', function () {
  beforeEach(function () {
    cy.visit('/')
  })

  it('displays header on home page', function () {
    cy.get('h1').should('contain', 'Hello Next.js')
  })

  it('renders top navigation', function () {
    navigationLinks.forEach((nav, index) => {
      cy.get('[data-test*=nav-]')
        .eq(index)
        .should('have.attr', 'href', nav.link)
        .and('have.text', nav.label)
    })
  })

  it('navigates to the about page', function () {
    cy.get('[data-test=nav-about]').click()
    cy.location('pathname').should('eq', '/about')
  })

  it('displays a list of users', function () {
    cy.get('[data-test=nav-users-list]').click()
    cy.location('pathname').should('eq', '/users')

    cy.fetchData('filter', 'users').each((user: User) => {
      cy.contains('[data-test=users-list]', user.name)
    })
  })

  it('performs and API test for users', function () {
    cy.request(`${Cypress.env('apiUrl')}/users`)
      .its('body')
      .should('eql', sampleUserData)
  })
})

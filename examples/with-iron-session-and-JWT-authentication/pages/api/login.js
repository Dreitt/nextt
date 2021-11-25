import fetchJson from '../../lib/fetchJson'
import withSession from '../../lib/session'
import sampleData from "../../lib/sampleData.json"

export default withSession(async (req, res) => {
  // Uncomment below lines for your real world implementation
  // const { username } = await req.body
  // const { password } = await req.body
  try {
    // we check that the user exists on server and store tokens and login data in session
    // const data = await fetchJson(URL_TO_AUTHENTICATE_AND_GET_LOGIN_DATA, {
    //   method: 'POST',
    //   headers: {
    //      'Content-Type': 'application/json'
    //   },
    //   body: {
    //      username,
    //      password
    //   }
    // });

    // Comment below line after your implementation
    const data = sampleData
    
    const user = { isLoggedIn: true, ...data}
    req.session.set('user', user)
    await req.session.save()
    res.json(user)
  } catch (error) {
    const { response: fetchResponse } = error
    res.status(fetchResponse?.status || 500).json(error.data)
  }
})

export const LONG_RUNNING_MS = 100

export default async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, LONG_RUNNING_MS))
  res.json({ hello: 'world' })
}

import type { MiddlewareHandler } from "hono"

export const uploadAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("x-upload-secret")

  if (!authHeader || authHeader !== process.env.UPLOAD_SECRET) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  await next()
}

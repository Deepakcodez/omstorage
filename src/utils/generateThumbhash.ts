import sharp from "sharp"
import { rgbaToThumbHash } from "thumbhash"

export const generateThumbhash = async (buffer: Buffer) => {
    const resized = await sharp(buffer)
        .resize(100, 100, { fit: "inside" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

    const { data, info } = resized

    const thumbhash = Buffer.from(rgbaToThumbHash(info.width, info.height, data)).toString("base64");
    return thumbhash
}

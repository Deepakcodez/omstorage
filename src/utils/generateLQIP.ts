import sharp from "sharp"

export const generateLQIP = async (buffer: Buffer) => {
    const lqipBuffer = await sharp(buffer)
        .resize(20)
        .webp({ quality: 20 })
        .toBuffer()

    const blurDataUrl = `data:image/webp;base64,${lqipBuffer.toString("base64")}`
    return blurDataUrl
}
import { PassThrough } from "stream"
import ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"

ffmpeg.setFfmpegPath(ffmpegPath as string)



export const getVideoThumbnailBuffer = (videoPath: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough()
    const chunks: Buffer[] = []

    stream.on("data", (chunk) => chunks.push(chunk))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)

    ffmpeg(videoPath)
      .seekInput(1)
      .frames(1)
      .outputOptions("-vcodec", "libwebp")
      .format("webp")
      .pipe(stream, { end: true })
  })
}

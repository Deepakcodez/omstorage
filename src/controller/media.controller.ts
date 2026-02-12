import type { Context } from "hono"
import { db } from "../lib/prisma"
import sharp from "sharp"
import { rgbaToThumbHash } from "thumbhash"
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto"
import ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"
import { generateLQIP } from "../utils/generateLQIP";
import { generateThumbhash } from "../utils/generateThumbhash";
import { getVideoThumbnailBuffer } from "../utils/generateVideoThumbnail";

ffmpeg.setFfmpegPath(ffmpegPath as string)





export const uploadImageMedia = async (c: Context)  => {
    try {
        const formData = await c.req.formData()
        const file = formData.get("file") as File
        const projectName = (formData.get("project") as string) || "default"

        if (!file) {
            return c.json({ error: "No file uploaded" }, 400)
        }

        if (!file.type.startsWith("image/")) {
            return c.json({ error: "Only images allowed" }, 400)
        }

        if (!projectName) {
            return c.json({ error: "Project name is required" }, 400)
        }

        if (file.type.startsWith("image/") && file.size > 1 * 1024 * 1024) {
            return c.json({ error: "File too large (max 1MB)" }, 400)
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // SHA256 checksum (dedup support)
        const checksum = crypto
            .createHash("sha256")
            .update(buffer)
            .digest("hex")

        // Check duplicate
        const existing = await db.media.findUnique({
            where: { checksum }
        })

        if (existing) {
            return c.json({ error: "File already exists" }, 400)
        }
        // Create upload directory
        const uploadDir = path.join(process.cwd(), "uploads", projectName)
        await mkdir(uploadDir, { recursive: true })

        const fileName = file.name + crypto.randomUUID() + ".webp"
        const filePath = path.join(uploadDir, fileName)

        // Process original image (convert to webp for optimization)
        const image = sharp(buffer)

        await image
            .webp({ quality: 90 })
            .toFile(filePath)

        // Generate LQIP (very low quality image)
        const blurDataUrl = await generateLQIP(buffer)

        // Generate Thumbhash
        const thumbhash = await generateThumbhash(buffer);
        const storageKey = `/uploads/${projectName}/${fileName}`
        // Save to DB
        const media = await db.media.create({
            data: {
                type: "IMAGE",
                project: projectName,
                name: file.name,
                url: storageKey,
                mimeType: "image/webp",
                thumbhash,
                blurDataUrl,
                checksum
            }
        })

        return c.json({
            message: "Image uploaded successfully",
            success: true,
            data: {
                name: media.name,
                url: media.url,
                thumbhash: media.thumbhash,
                blurDataUrl: media.blurDataUrl,
            }
        })

    } catch (error) {
        console.error(error)
        return c.json({ error: "Upload failed" }, 500)
    }
}


export const uploadMultipleImageMedia = async (c: Context) => {
    try {
        const formData = await c.req.formData()
        const files = formData.getAll("files") as File[]
        const projectName = (formData.get("project") as string) || "default"

        if (!files || files.length === 0) {
            return c.json({ error: "No files uploaded" }, 400)
        }

        const uploadDir = path.join(process.cwd(), "uploads", projectName)
        await mkdir(uploadDir, { recursive: true })

        const results = []

        for (const file of files) {
            if (!file.type.startsWith("image/")) {
                results.push({ name: file.name, error: "Invalid file type" })
                continue
            }

            const buffer = Buffer.from(await file.arrayBuffer())

            // SHA256 checksum
            const checksum = crypto
                .createHash("sha256")
                .update(buffer)
                .digest("hex")

            const existing = await db.media.findUnique({
                where: { checksum }
            })

            if (existing) {
                results.push({ name: file.name, error: "Duplicate file" })
                continue
            }

            const fileId = crypto.randomUUID()

            // IMAGE PROCESSING
            if (file.type.startsWith("image/")) {
                const fileName = `${file.name}-${fileId}.webp`
                const filePath = path.join(uploadDir, fileName)
                const storageKey = `/uploads/${projectName}/${fileName}`

                const image = sharp(buffer)
                await image.webp({ quality: 85 }).toFile(filePath)

                const lqipBuffer = await sharp(buffer)
                    .resize(20)
                    .webp({ quality: 30 })
                    .toBuffer()

                const blurDataUrl =
                    `data:image/webp;base64,${lqipBuffer.toString("base64")}`

                const resized = await sharp(buffer)
                    .resize(100, 100, { fit: "inside" })
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true })

                const { data, info } = resized

                const thumbhash = Buffer.from(
                    rgbaToThumbHash(info.width, info.height, data)
                ).toString("base64")

                const media = await db.media.create({
                    data: {
                        type: "IMAGE",
                        project: projectName,
                        name: file.name,
                        url: storageKey,
                        mimeType: "image/webp",
                        thumbhash,
                        blurDataUrl,
                        checksum
                    }
                })

                results.push({
                    name: media.name,
                    url: media.url,
                    thumbhash: media.thumbhash,
                    blurDataUrl: media.blurDataUrl,
                })
            }
        }

        return c.json({
            message: "Images uploaded successfully",
            success: true,
            count: results.length,
            data: results
        })

    } catch (error) {
        console.error(error)
        return c.json({ error: "Upload failed" }, 500)
    }
}

export const uploadVideoMedia = async (c: Context) => {
    try {
        const formData = await c.req.formData()
        const file = formData.get("file") as File
        const projectName = (formData.get("project") as string) || "default"



        if (!file) {
            return c.json({ error: "No file uploaded" }, 400)
        }

        if (!file.type.startsWith("video/")) {
            return c.json({ error: "Only videos allowed" }, 400)
        }

        if (file.size > 10 * 1024 * 1024) {
            return c.json({ error: "File too large (max 10MB)" }, 400)
        }

        const buffer = Buffer.from(await file.arrayBuffer())



        // SHA256 checksum
        const checksum = crypto
            .createHash("sha256")
            .update(buffer)
            .digest("hex")

        const existing = await db.media.findUnique({
            where: { checksum }
        })

        if (existing) {
            return c.json({ error: "File already exists" }, 400)
        }

        // Create upload directory
        const uploadDir = path.join(process.cwd(), "uploads", projectName)
        await mkdir(uploadDir, { recursive: true })

        const videoId = crypto.randomUUID()
        const ext = file.name.split(".").pop()
        const videoFileName = `${file.name}-${videoId}.${ext}`
        const videoPath = path.join(uploadDir, videoFileName)

        const storageKey = `/uploads/${projectName}/${videoFileName}`

        // Save original video
        await writeFile(videoPath, buffer)

        const thumbnailBuffer = await getVideoThumbnailBuffer(videoPath)
        // Generate thumbnail
        const thumbnailName = `${videoId}.webp`
        const thumbnailPath = path.join(uploadDir, thumbnailName)
        const thumbnailKey = `/uploads/${projectName}/${thumbnailName}`
        await writeFile(thumbnailPath, thumbnailBuffer)


        // 🔥 Generate thumbhash & blur from thumbnail buffer
        const thumbhash = await generateThumbhash(thumbnailBuffer)
        const blurDataUrl = await generateLQIP(thumbnailBuffer)

        // Save in DB
        const media = await db.media.create({
            data: {
                type: "VIDEO",
                project: projectName,
                name: file.name,
                url: storageKey,
                mimeType: file.type,
                checksum,
                thumbhash,
                blurDataUrl,
                videoThumbnail: thumbnailKey
            }
        })

        return c.json({
            message: "Video uploaded successfully",
            success: true,
            data: {
                name: media.name,
                url: media.url,
                videoThumbnail: media.videoThumbnail,
                thumbhash: media.thumbhash,
                blurDataUrl: media.blurDataUrl,
            }
        })

    } catch (error) {
        console.error(error)
        return c.json({ error: "Video upload failed" }, 500)
    }
}


export const getMedia = async (c: Context) => {
    try {
        const { id } = c.req.param()
        const media = await db.media.findUnique({
            where: { id }
        })
        if (!media) {
            return c.json({ error: "Media not found" }, 404)
        }
        return c.json({ media })
    } catch (error) {
        console.error(error)
        return c.json({ error: "Failed to get media" }, 500)
    }
}

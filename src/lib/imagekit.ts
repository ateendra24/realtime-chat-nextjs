import ImageKit from 'imagekit';

// ImageKit configuration
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});

export default imagekit;

// Helper function to upload file to ImageKit
export async function uploadToImageKit(
    file: File,
    fileName: string,
    folder?: string
): Promise<{ url: string; fileId: string }> {
    try {
        // Convert File to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadResponse = await imagekit.upload({
            file: buffer,
            fileName: fileName,
            folder: folder || '/group-avatars',
            useUniqueFileName: true,
            transformation: {
                pre: 'w-200,h-200,c-maintain_ratio'
            }
        });

        return {
            url: uploadResponse.url,
            fileId: uploadResponse.fileId
        };
    } catch (error) {
        console.error('ImageKit upload error:', error);
        throw new Error('Failed to upload image to ImageKit');
    }
}

// Helper function to delete file from ImageKit
export async function deleteFromImageKit(fileId: string): Promise<void> {
    try {
        await imagekit.deleteFile(fileId);
    } catch (error) {
        console.error('ImageKit delete error:', error);
        throw new Error('Failed to delete image from ImageKit');
    }
}

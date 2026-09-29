import { cloudinary } from "../lib/cloudinary";

export const deleteCloudinaryFile = async (
	publicId: string,
	resourceType?: string,
) => {
	await cloudinary.uploader.destroy(publicId, {
		resource_type: resourceType,
		invalidate: true,
	});
};

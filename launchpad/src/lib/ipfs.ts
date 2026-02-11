import PinataSDK from "@pinata/sdk";
import { Readable } from "stream";

const apiKey = process.env.PINATA_API_KEY;
const apiSecret = process.env.PINATA_SECRET_API_KEY;

const pinata = apiKey && apiSecret ? new PinataSDK(apiKey, apiSecret) : null;

export async function uploadImageToIPFS(buffer: Buffer, fileName?: string): Promise<string> {
  if (!pinata) throw new Error("Pinata not configured");
  const stream = Readable.from(buffer);
  const result = await pinata.pinFileToIPFS(stream, {
    pinataMetadata: fileName ? { name: fileName } : undefined,
  });
  return `ipfs://${result.IpfsHash}`;
}

export async function uploadMetadataToIPFS(metadata: object): Promise<string> {
  if (!pinata) throw new Error("Pinata not configured");
  const result = await pinata.pinJSONToIPFS(metadata);
  return `ipfs://${result.IpfsHash}`;
}

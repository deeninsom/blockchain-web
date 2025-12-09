// src/lib/ipfs/uploadToIPFS.ts

import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export async function uploadToIPFS(
  data: string,
  isFilePath: boolean = true,
  mimeType: string = 'application/octet-stream'
) {
  try {
    const form = new FormData();

    if (isFilePath) {
      form.append("file", fs.createReadStream(data));
    } else {
      form.append("file", data, {
        contentType: mimeType,
        filename: `data-${Date.now()}.json`
      });
    }

    const IPFS_UPLOAD_URL = process.env.IPFS_UPLOAD_URL;
    const IPFS_GATEWAY_URL = process.env.IPFS_GATEWAY_URL;

    console.log(IPFS_UPLOAD_URL)
    const response = await axios.post(`${IPFS_UPLOAD_URL}/add`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const { Hash, Name } = response.data;

    return {
      cid: Hash,
      fileName: Name,
      gatewayUrl: `${IPFS_GATEWAY_URL}/${Hash}`,
    };
  } catch (error: any) {
    console.error("IPFS upload error:", error.response?.data || error.message);
    throw new Error("Failed to upload file to IPFS");
  }
}
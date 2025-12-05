import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export async function uploadToIPFS(filePath: string) {
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const ipfsApi = process.env.IPFS_API_URL || "http://localhost:5001/api/v0";

    const response = await axios.post(`${ipfsApi}/add`, form, {
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
      gatewayUrl: `http://localhost:8080/ipfs/${Hash}`,
    };
  } catch (error: any) {
    console.error("IPFS upload error:", error.response?.data || error.message);
    throw new Error("Failed to upload file to IPFS");
  }
}

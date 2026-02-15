import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],

  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },

  networks: {
    // 🔹 Local simulated networks (tetap kamu pakai)
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhat: {
      type: "edr-simulated",
      chainId: 1337,
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },

    // 🔹 Ethereum Sepolia
    sepolia: {
      type: "http",
      chainType: "l1",
      url: "https://sepolia.infura.io/v3/c4a929eb03df4503baed0d9af847a5b0",
      accounts: [process.env.PRIVATE_KEY!],
    },

    // 🔹 Polygon Mumbai
    polygonMumbai: {
      type: "http",
      chainType: "l1",
      url: "https://polygon-amoy.infura.io/v3/c4a929eb03df4503baed0d9af847a5b0",
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
});



// import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
// import { configVariable, defineConfig } from "hardhat/config";

// export default defineConfig({
//   plugins: [hardhatToolboxViemPlugin],
//   solidity: {
//     profiles: {
//       default: {
//         version: "0.8.28",
//       },
//       production: {
//         version: "0.8.28",
//         settings: {
//           optimizer: {
//             enabled: true,
//             runs: 200,
//           },
//         },
//       },
//     },
//   },
//   networks: {
//     hardhatMainnet: {
//       type: "edr-simulated",
//       chainType: "l1",
//     },
//     hardhat: {
//       type: "edr-simulated",
//       chainId: 1337
//     },
//     hardhatOp: {
//       type: "edr-simulated",
//       chainType: "op",
//     },
//   },
// });

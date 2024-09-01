import fs from "fs";
import readline from "readline";

import dotenv from "dotenv";
import ora from "ora";
import { Command } from "commander";
import { execSync } from "child_process";

// === Constants ==================================================================================
const CONFIG_FILENAME = "./src/script/config.json";
const DEFAULT_RPC_URL = "http://localhost:8545";
const DEFAULT_TREE_DEPTH = 30;
const DEFAULT_MESSENGER_L1 = "0xB218f8A4Bc926cF1cA7b3423c154a0D627Bdb7E5";
const DEFAULT_MESSENGER_L2 = "0x971e727e956690b9957be6d51Ec16E73AcAC83A7";
const DEFAULT_WORLD_ID_MANAGER = "0x928a514350A403e2f5e3288C102f6B1CCABeb37C";
const addressRegex = /0x[a-fA-F0-9]{40}/;

// === Implementation =============================================================================

/**
 * Asks the user a question and returns the answer.
 *
 * @param {string} question the question contents.
 * @param {?string} type an optional type to parse the answer as. Currently only supports 'int' for
 *        decimal integers. and `bool` for booleans.
 * @returns a promise resolving to user's response
 */
function ask(question, type) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question(question, (input) => {
      if (type === "int" && input) {
        input = parseInt(input.trim());
        if (isNaN(input)) {
          reject("Invalid input");
        }
      }
      if (type === "bool") {
        if (!input) {
          input = undefined;
        } else {
          switch (input.trim()) {
            case "y":
            case "Y":
            case "true":
            case "True":
              input = true;
              break;
            case "n":
            case "N":
            case "false":
            case "False":
              input = false;
              break;
            default:
              reject("Invalid input");
              break;
          }
        }
      }
      resolve(input);
      rl.close();
    });
  });
}

///////////////////////////////////////////////////////////////////
///                      DEPLOYMENT CONFIG                      ///
///////////////////////////////////////////////////////////////////
async function getPrivateKey(config) {
  if (!config.privateKey) {
    config.privateKey = process.env.PRIVATE_KEY;
  }
  if (!config.privateKey) {
    config.privateKey = await ask("Enter your private key: ");
  }
}

async function getMessageServiceAddressL1(config) {
  if (!config.messageServiceAddressL1) {
    config.messageServiceAddressL1 = process.env.MESSENGER_SERVICE_ADDRESS_L1;
  }
  if (!config.messageServiceAddressL1) {
    config.messageServiceAddressL1 = await ask(`Enter L1 message service address: (${DEFAULT_MESSENGER_L1}) `);
  }
  if (!config.messageServiceAddressL1) {
    config.messageServiceAddressL1 = DEFAULT_MESSENGER_L1;
  }
}

async function getMessageServiceAddressL2(config) {
  if (!config.messageServiceAddressL2) {
    config.messageServiceAddressL2 = process.env.MESSENGER_SERVICE_ADDRESS_L2;
  }
  if (!config.messageServiceAddressL2) {
    config.messageServiceAddressL2 = await ask(`Enter L2 message service address: (${DEFAULT_MESSENGER_L2}) `);
  }
  if (!config.messageServiceAddressL2) {
    config.messageServiceAddressL2 = DEFAULT_MESSENGER_L2;
  }
}

async function getEthereumRpcUrl(config) {
  if (!config.ethereumRpcUrl) {
    config.ethereumRpcUrl = process.env.ETH_RPC_URL;
  }
  if (!config.ethereumRpcUrl) {
    config.ethereumRpcUrl = await ask(`Enter Ethereum RPC URL: (${DEFAULT_RPC_URL}) `);
  }
  if (!config.ethereumRpcUrl) {
    config.ethereumRpcUrl = DEFAULT_RPC_URL;
  }
}

async function getLineaRpcUrl(config) {
  if (!config.lineaRpcUrl) {
    config.lineaRpcUrl = process.env.LINEA_RPC_URL;
  }
  if (!config.lineaRpcUrl) {
    config.lineaRpcUrl = await ask(`Enter Linea RPC URL: (${DEFAULT_RPC_URL}) `);
  }
  if (!config.lineaRpcUrl) {
    config.lineaRpcUrl = DEFAULT_RPC_URL;
  }
}

async function getEthereumEtherscanApiKey(config) {
  if (!config.ethereumEtherscanApiKey) {
    config.ethereumEtherscanApiKey = process.env.ETHERSCAN_API_KEY;
  }
  if (!config.ethereumEtherscanApiKey) {
    config.ethereumEtherscanApiKey = await ask(
      `Enter Ethereum Etherscan API KEY: (https://etherscan.io/myaccount) (Leave it empty for mocks) `,
    );
  }
}

async function getLineaEtherscanApiKey(config) {
  if (!config.lineaScanApiKey) {
    config.lineaScanApiKey = process.env.LINEA_SCAN_API_KEY;
  }
  if (!config.lineaScanApiKey) {
    config.lineaScanApiKey = await ask(
      `Enter Lineascan API KEY: (https://lineascan.build/myaccount) (Leave it empty for mocks) `,
    );
  }
}

async function getTreeDepth(config) {
  if (!config.treeDepth) {
    config.treeDepth = await ask(`Enter WorldID tree depth: (${DEFAULT_TREE_DEPTH}) `);
  }
  if (!config.treeDepth) {
    config.treeDepth = DEFAULT_TREE_DEPTH;
  }
}

async function getLineaWorldIDAddress(config) {
  if (!config.lineaWorldIDAddress) {
    config.lineaWorldIDAddress = process.env.LINEA_WORLD_ID_ADDRESS;
  }
  if (!config.lineaWorldIDAddress) {
    config.lineaWorldIDAddress = await ask("Enter Linea WorldID Address: ");
  }
}

async function getLineaStateBridgeAddress(config) {
  if (!config.lineaStateBridgeAddress) {
    config.lineaStateBridgeAddress = process.env.LINEA_STATE_BRIDGE_ADDRESS;
  }
  if (!config.lineaStateBridgeAddress) {
    config.lineaStateBridgeAddress = await ask("Enter Linea State Bridge Address: ");
  }
}

async function getWorldIDIdentityManagerAddress(config) {
  if (!config.worldIDIdentityManagerAddress) {
    config.worldIDIdentityManagerAddress = process.env.WORLD_ID_IDENTITY_MANAGER_ADDRESS;
  }
  if (!config.worldIDIdentityManagerAddress) {
    config.worldIDIdentityManagerAddress = await ask(
      `Enter WorldID Identity Manager Address: (${DEFAULT_WORLD_ID_MANAGER}) `,
    );
  }
  if (!config.worldIDIdentityManagerAddress) {
    config.worldIDIdentityManagerAddress = DEFAULT_WORLD_ID_MANAGER;
  }
}

///////////////////////////////////////////////////////////////////
///                            UTILS                            ///
///////////////////////////////////////////////////////////////////
async function loadConfiguration(useConfig) {
  if (!useConfig) {
    return {};
  }
  let answer = await ask(`Do you want to load configuration from prior runs? [Y/n]: `, "bool");
  const spinner = ora("Configuration Loading").start();
  if (answer === undefined) {
    answer = true;
  }
  if (answer) {
    if (!fs.existsSync(CONFIG_FILENAME)) {
      spinner.warn("Configuration load requested but no configuration available: continuing");
      return {};
    }
    try {
      const fileContents = JSON.parse(fs.readFileSync(CONFIG_FILENAME).toString());
      if (fileContents) {
        spinner.succeed("Configuration loaded");
        return fileContents;
      } else {
        spinner.warn("Unable to parse configuration: deleting and continuing");
        fs.rmSync(CONFIG_FILENAME);
        return {};
      }
    } catch {
      spinner.warn("Unable to parse configuration: deleting and continuing");
      fs.rmSync(CONFIG_FILENAME);
      return {};
    }
  } else {
    spinner.succeed("Configuration not loaded");
    const data = JSON.stringify({});
    fs.writeFileSync(CONFIG_FILENAME, data);
    return {};
  }
}

async function saveConfiguration(config) {
  const oldData = (() => {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILENAME).toString());
    } catch {
      return {};
    }
  })();

  const data = JSON.stringify({ ...oldData, ...config });
  fs.writeFileSync(CONFIG_FILENAME, data);
}

export function parseJson(data) {
  let jsonStartIndex = data.indexOf("{");
  let jsonEndIndex = data.lastIndexOf("}");
  if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
    const jsonString = data.substring(jsonStartIndex, jsonEndIndex + 1);
    try {
      const jsonData = JSON.parse(jsonString);
      return jsonData;
    } catch (error) {
      throw error;
    }
  } else {
    return {};
  }
}

///////////////////////////////////////////////////////////////////
///                         DEPLOYMENTS                         ///
///////////////////////////////////////////////////////////////////

async function deployLineaWorldID(config) {
  const spinner = ora("Deploying LineaID on Linea...").start();

  try {
    let command = `forge script src/script/DeployLineaWorldID.s.sol:DeployLineaWorldID --fork-url ${config.lineaRpcUrl} --broadcast --json`;
    if (config.lineaEtherscanApiKey) {
      command += ` --etherscan-api-key ${config.lineaEtherscanApiKey} --verify`;
    }
    const output = execSync(command);
    const data = output.toString();
    const jsonData = parseJson(data);
    if (jsonData.success) {
      for (const log of jsonData.logs) {
        if (!log.includes("LineaWorldID")) continue;
        const match = data.match(addressRegex);
        if (!match) continue;
        const contractAddress = match[0];
        config.lineaWorldIDAddress = contractAddress;
      }
    }
    spinner.succeed("DeployLineaWorldID.s.sol ran successfully!");
  } catch (err) {
    spinner.fail("DeployLineaWorldID.s.sol failed!");
    throw err;
  }
}

///////////////////////////////////////////////////////////////////
///                      MAINNET DEPLOYMENT                     ///
///////////////////////////////////////////////////////////////////

async function deployLineaStateBridgeMainnet(config) {
  const spinner = ora("Deploying Linea State Bridge...").start();

  try {
    let command = `forge script src/script/DeployLineaStateBridge.s.sol:DeployLineaStateBridge --fork-url ${config.ethereumRpcUrl} --broadcast -vvvv --json`;
    if (config.ethereumEtherscanApiKey) {
      command += ` --etherscan-api-key ${config.lineaEtherscanApiKey} --verify`;
    }
    const output = execSync(command);
    const data = output.toString();
    const jsonData = parseJson(data);
    if (jsonData.success) {
      for (const log of jsonData.logs) {
        if (!log.includes("LineaStateBridge")) continue;
        const match = data.match(addressRegex);
        if (!match) continue;
        const contractAddress = match[0];
        config.lineaStateBridgeAddress = contractAddress;
      }
    }
    spinner.succeed("DeployLineaStateBridge.s.sol ran successfully!");
  } catch (err) {
    spinner.fail("DeployLineaStateBridge.s.sol failed!");
    throw err;
  }
}

///////////////////////////////////////////////////////////////////
///                          INITIALIZE                         ///
///////////////////////////////////////////////////////////////////

async function InitializeLineaWorldID(config) {
  const spinner = ora("Initializing LineaWorldId...").start();

  try {
    const data = execSync(
      `forge script src/script/InitializeLineaWorldID.s.sol:InitializeLineaWorldID --fork-url ${config.lineaRpcUrl} --broadcast -vvvv --legacy --json`,
    );
    const jsonData = parseJson(data.toString());
    if (jsonData.success) {
      spinner.succeed("InitializeLineaStateBridge.s.sol ran successfully!");
    }
  } catch (err) {
    spinner.fail("InitializeLineaStateBridge.s.sol failed!");
    throw err;
  }
}

///////////////////////////////////////////////////////////////////
///                     SCRIPT ORCHESTRATION                    ///
///////////////////////////////////////////////////////////////////

async function deploymentMainnet(config) {
  dotenv.config();
  try {
    await getPrivateKey(config);
    await getEthereumRpcUrl(config);
    await getLineaRpcUrl(config);
    await getEthereumEtherscanApiKey(config);
    await getLineaEtherscanApiKey(config);
    await getTreeDepth(config);
    await getMessageServiceAddressL1(config);
    await getMessageServiceAddressL2(config);
    await saveConfiguration(config);
    await deployLineaWorldID(config);
    await saveConfiguration(config);
    await getWorldIDIdentityManagerAddress(config);
    await getLineaWorldIDAddress(config);
    await saveConfiguration(config);
    await deployLineaStateBridgeMainnet(config);
    await saveConfiguration(config);
    await getLineaStateBridgeAddress(config);
    await saveConfiguration(config);
    await InitializeLineaWorldID(config);
  } catch (err) {
    throw err;
  }
}

///////////////////////////////////////////////////////////////////
///                             CLI                             ///
///////////////////////////////////////////////////////////////////

async function main() {
  const program = new Command();

  program
    .name("deploy")
    .description("A CLI interface for deploying the WorldID state bridge on Linea mainnet.")
    .option("--no-config", "Do not use any existing configuration.");

  program
    .command("deploy")
    .description("Interactively deploys the WorldID state bridge on Linea mainnet.")
    .action(async () => {
      const options = program.opts();
      let config = await loadConfiguration(options.config);
      await deploymentMainnet(config);
      await saveConfiguration(config);
    });

  await program.parseAsync();
}

main().then(() => process.exit(0));
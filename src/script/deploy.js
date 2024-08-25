import fs from "fs";
import readline from "readline";

import dotenv from "dotenv";
import ora from "ora";
import { Command } from "commander";
import { execSync } from "child_process";

// === Constants ==================================================================================
const CONFIG_FILENAME = "src/script/.deploy-config.json";
const DEFAULT_RPC_URL = "http://localhost:8545";

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
    config.treeDepth = await ask("Enter WorldID tree depth: ");
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
    config.worldIDIdentityManagerAddress = await ask("Enter WorldID Identity Manager Address: ");
  }
}

///////////////////////////////////////////////////////////////////
///                            UTILS                            ///
///////////////////////////////////////////////////////////////////
async function loadConfiguration(useConfig, environment) {
  if (!useConfig) {
    return {};
  }
  const defaultConfigFile = `src/script/config/default-${environment}-config.json`;
  if (!fs.existsSync(CONFIG_FILENAME)) {
    if (fs.existsSync(defaultConfigFile)) {
      fs.copyFileSync(defaultConfigFile, CONFIG_FILENAME);
      console.log(`Default configuration for ${environment} copied to ${CONFIG_FILENAME}`);
    } else {
      console.warn(`Default configuration file for ${environment} not found.`);
    }
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

///////////////////////////////////////////////////////////////////
///                         DEPLOYMENTS                         ///
///////////////////////////////////////////////////////////////////

async function deployLineaWorldID(config) {
  const spinner = ora("Deploying LineaID on Linea...").start();

  try {
    const data = execSync(
      `forge script src/script/DeployLineaWorldID.s.sol:DeployOpWorldID --fork-url ${config.lineaRpcUrl} \
      --etherscan-api-key ${config.lineaEtherscanApiKey} --broadcast --verify -vvvv`,
    );
    console.log(data.toString());
  } catch (err) {
    console.error(err);
  }

  spinner.succeed("DeployLineaWorldID.s.sol ran successfully!");
}

///////////////////////////////////////////////////////////////////
///                      MAINNET DEPLOYMENT                     ///
///////////////////////////////////////////////////////////////////

async function deployLineaStateBridgeMainnet(config) {
  const spinner = ora("Deploying Linea State Bridge...").start();

  try {
    const data =
      execSync(`forge script src/script/DeployLineaStateBridgeMainnet.s.sol:DeployLineaStateBridgeMainnet --fork-url ${config.ethereumRpcUrl} \
      --etherscan-api-key ${config.ethereumEtherscanApiKey} --broadcast --verify -vvvv`);
    console.log(data.toString());
  } catch (err) {
    console.error(err);
  }

  spinner.succeed("DeployLineaStateBridgeMainnet.s.sol ran successfully!");
}

///////////////////////////////////////////////////////////////////
///                          INITIALIZE                         ///
///////////////////////////////////////////////////////////////////

async function InitializeLineaStateBridge(config) {
  const spinner = ora("Initializing LineaStateBridge...").start();

  try {
    const data = execSync(
      `forge script src/script/InitializeLineaStateBridge.s.sol:LineaStateBridge --fork-url ${config.lineaRpcUrl} --broadcast -vvvv --legacy`,
    );
    console.log(data.toString());
  } catch (err) {
    console.error(err);
  }

  spinner.succeed("InitializeLineaStateBridge.s.sol ran successfully!");
}

///////////////////////////////////////////////////////////////////
///                     SCRIPT ORCHESTRATION                    ///
///////////////////////////////////////////////////////////////////

async function deploymentMainnet(config) {
  dotenv.config();

  await getPrivateKey(config);
  await getEthereumRpcUrl(config);
  await getLineaRpcUrl(config);
  await getEthereumEtherscanApiKey(config);
  await getLineaEtherscanApiKey(config);
  await getTreeDepth(config);
  await saveConfiguration(config);
  await deployLineaWorldID(config);
  await getWorldIDIdentityManagerAddress(config);
  await getLineaWorldIDAddress(config);
  await saveConfiguration(config);
  await deployLineaStateBridgeMainnet(config);
  await getLineaStateBridgeAddress(config);
  await saveConfiguration(config);
  await InitializeLineaStateBridge(config);
}

///////////////////////////////////////////////////////////////////
///                             CLI                             ///
///////////////////////////////////////////////////////////////////

async function main() {
  const program = new Command();

  program
    .name("deploy")
    .description("A CLI interface for deploying the WorldID state bridge on Linea.")
    .option("--no-config", "Do not use any existing configuration.")
    .option("--env <environment>", "Specify the environment (e.g., mainnet, sepolia)", "mainnet");

  program
    .command("deploy")
    .description("Interactively deploys the WorldID state bridge on Linea mainnet.")
    .action(async () => {
      const options = program.opts();
      const environment = options.env || "mainnet";
      let config = await loadConfiguration(options.config, environment);
      await deploymentMainnet(config);
      await saveConfiguration(config);
    });

  await program.parseAsync();
}

main().then(() => process.exit(0));

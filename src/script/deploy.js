import fs from "fs";
import path from "path";
import readline from "readline";

import dotenv from "dotenv";
import ora from "ora";
import { Command } from "commander";
import { execSync } from "child_process";

// === Constants ==================================================================================
const CONFIG_FILENAME = "src/script/.deploy-config.json";
const DEFAULT_RPC_URL = "http://localhost:8545";
const DEFAULT_TREE_DEPTH = 30;
const addressRegex = /0x[a-fA-F0-9]{40}/;

// === Implementation =============================================================================

function loadEnvFile(environment) {
  const envFile = path.resolve(process.cwd(), `${environment}.env`);
  dotenv.config({ path: envFile });
}

/**
 * Asks the user a question and returns the answer.
 *
 * @param {string} question - The question contents.
 * @param {?string} type - An optional type to parse the answer as. Currently supports 'int' for
 *        decimal integers and 'bool' for booleans.
 * @returns {Promise<any>} A promise resolving to the user's response.
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
      } else if (type === "bool") {
        if (!input) {
          input = undefined;
        } else {
          switch (input.trim().toLowerCase()) {
            case "y":
            case "true":
              input = true;
              break;
            case "n":
            case "false":
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

/**
 * Retrieves a configuration value, first checking the config object, then environment variables,
 * and finally prompting the user if necessary.
 *
 * @param {Object} config - The configuration object to update.
 * @param {string} key - The key to retrieve and store in the config.
 * @param {string} envVarName - The environment variable name to check.
 * @param {string} question - The question to ask the user if the value is not found.
 * @param {?any} defaultValue - The default value to use if the user provides no input.
 * @param {?string} type - The type of the expected value ('int', 'bool').
 */
async function getConfigValue(config, key, envVarName, question, defaultValue, type) {
  if (!config[key]) {
    config[key] = process.env[envVarName];
  }
  if (!config[key]) {
    config[key] = await ask(question, type);
  }
  if (!config[key] && defaultValue !== undefined) {
    config[key] = defaultValue;
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

function saveConfiguration(config) {
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
  const spinner = ora("Deploying and verifying LineaWorldID on Linea...").start();

  // Check if lineaWorldIDAddress is already in the JSON config
  if (config.lineaWorldIDAddress) {
    spinner.succeed(`LineaWorldID already deployed at ${config.lineaWorldIDAddress}`);
    return;
  }

  try {
    let command = `forge script src/script/DeployLineaWorldID.s.sol:DeployLineaWorldID --fork-url ${config.lineaRpcUrl} --broadcast --json`;
    if (config.lineaScanApiKey) {
      command += ` --etherscan-api-key ${config.lineaScanApiKey} --verify`;
    }
    const output = execSync(command);
    const data = output.toString();
    const jsonData = parseJson(data);
    if (jsonData.success) {
      for (const log of jsonData.logs) {
        if (!log.includes("LineaWorldID")) continue;
        const match = log.match(addressRegex);
        if (!match) continue;
        const contractAddress = match[0];
        config.lineaWorldIDAddress = contractAddress;
      }
    }
    spinner.succeed(`LineaWorldID deployed and verified successfully at ${config.lineaWorldIDAddress}`);
  } catch (err) {
    spinner.fail("Failed to deploy and verify LineaWorldID!");
    throw err;
  }
}

///////////////////////////////////////////////////////////////////
///                      MAINNET DEPLOYMENT                     ///
///////////////////////////////////////////////////////////////////

async function deployLineaStateBridge(config) {
  const spinner = ora("Deploying Linea State Bridge on Ethereum...").start();

  // Check if lineaStateBridgeAddress is already in the JSON config
  if (config.lineaStateBridgeAddress) {
    spinner.succeed(`LineaStateBridge already deployed at ${config.lineaStateBridgeAddress}`);
    return;
  }

  try {
    let command = `forge script src/script/DeployLineaStateBridge.s.sol:DeployLineaStateBridge --fork-url ${config.ethereumRpcUrl} --broadcast -vvvv --json`;
    if (config.etherscanApiKey) {
      command += ` --etherscan-api-key ${config.etherscanApiKey} --verify`;
    }
    const output = execSync(command);
    const data = output.toString();
    const jsonData = parseJson(data);
    if (jsonData.success) {
      for (const log of jsonData.logs) {
        if (!log.includes("LineaStateBridge")) continue;
        const match = log.match(addressRegex);
        if (!match) continue;
        const contractAddress = match[0];
        config.lineaStateBridgeAddress = contractAddress;
      }
    }
    spinner.succeed(`LineaStateBridge deployed successfully at ${config.lineaStateBridgeAddress}`);
  } catch (err) {
    spinner.fail("Failed to deploy LineaStateBridge!");
    throw err;
  }
}

///////////////////////////////////////////////////////////////////
///                          INITIALIZE                         ///
///////////////////////////////////////////////////////////////////

async function InitializeLineaWorldID(config) {
  const spinner = ora("Changing LineaWorldId ownership...").start();

  try {
    const data = execSync(
      `forge script src/script/InitializeLineaWorldID.s.sol:InitializeLineaWorldID --fork-url ${config.lineaRpcUrl} --broadcast -vvvv --legacy --json`,
    );
    const jsonData = parseJson(data.toString());
    if (jsonData.success) {
      spinner.succeed("LineaWorldID ownership transferred to LineaStateBridge on L1");
    }
  } catch (err) {
    spinner.fail("Failed to transfer ownership of LineaWorldID to LineaStateBridge on L1");
    throw err;
  }
}

///////////////////////////////////////////////////////////////////
///                     SCRIPT ORCHESTRATION                    ///
///////////////////////////////////////////////////////////////////

async function deployment(config) {
  dotenv.config();
  try {
    await getConfigValue(config, "privateKey", "PRIVATE_KEY", "Enter your private key: ");
    await getConfigValue(
      config,
      "ethereumRpcUrl",
      "ETH_RPC_URL",
      `Enter Ethereum RPC URL: (${DEFAULT_RPC_URL}) `,
      DEFAULT_RPC_URL,
    );
    await getConfigValue(
      config,
      "lineaRpcUrl",
      "LINEA_RPC_URL",
      `Enter Linea RPC URL: (${DEFAULT_RPC_URL}) `,
      DEFAULT_RPC_URL,
    );
    await getConfigValue(
      config,
      "etherscanApiKey",
      "ETHERSCAN_API_KEY",
      `Enter Ethereum Etherscan API KEY: (https://etherscan.io/myaccount) (Leave it empty for mocks) `,
    );
    await getConfigValue(
      config,
      "lineaScanApiKey",
      "LINEA_SCAN_API_KEY",
      `Enter Lineascan API KEY: (https://lineascan.build/myaccount) (Leave it empty for mocks) `,
    );
    await getConfigValue(config, "lineaScanVerifierUrl", "LINEA_SCAN_VERIFIER_URL", "Enter Lineascan Verifier URL: ");
    await getConfigValue(
      config,
      "treeDepth",
      null,
      `Enter WorldID tree depth: (${DEFAULT_TREE_DEPTH}) `,
      DEFAULT_TREE_DEPTH,
      "int",
    );
    await getConfigValue(
      config,
      "messageServiceAddressL1",
      "MESSAGE_SERVICE_ADDRESS_L1",
      "Enter L1 message service address: ",
    );
    await getConfigValue(
      config,
      "messageServiceAddressL2",
      "MESSAGE_SERVICE_ADDRESS_L2",
      "Enter L2 message service address: ",
    );
    await saveConfiguration(config);
    await deployLineaWorldID(config);
    await saveConfiguration(config);
    await getConfigValue(
      config,
      "worldIDIdentityManagerAddress",
      "WORLD_ID_IDENTITY_MANAGER_ADDRESS",
      "Enter WorldID Identity Manager Address: ",
    );
    await getConfigValue(config, "lineaWorldIDAddress", "LINEA_WORLD_ID_ADDRESS", "Enter Linea WorldID Address: ");
    await saveConfiguration(config);
    await deployLineaStateBridge(config);
    await saveConfiguration(config);
    await getConfigValue(
      config,
      "lineaStateBridgeAddress",
      "LINEA_STATE_BRIDGE_ADDRESS",
      "Enter Linea State Bridge Address: ",
    );
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
    .description("A CLI interface for deploying the WorldID state bridge on Linea.")
    .option("--no-config", "Do not use any existing configuration.")
    .option("--env <environment>", "Specify the environment (e.g., mainnet, sepolia)", "mainnet");

  program
    .command("deploy")
    .description("Interactively deploys the WorldID state bridge on Linea mainnet.")
    .action(async () => {
      const options = program.opts();
      const environment = options.env || "mainnet";

      console.log("Loading environment:", environment);
      loadEnvFile(environment);
      let config = await loadConfiguration(options.config);

      await deployment(config);
      await saveConfiguration(config);
    });

  await program.parseAsync();
}

main().then(() => process.exit(0));

import fs from "fs";
import path from "path";
import readline from "readline";

import dotenv from "dotenv";
import ora from "ora";
import { Command } from "commander";
import { execSync } from "child_process";
import { ethers } from "ethers";

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

/**
 * Gets the chain ID from the provided RPC URL.
 * @param {string} rpcUrl - The RPC URL of the network.
 * @returns {Promise<string>} - The chain ID as a string.
 */
async function getChainId(rpcUrl) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  return network.chainId.toString();
}

///////////////////////////////////////////////////////////////////
///                         DEPLOYMENTS                         ///
///////////////////////////////////////////////////////////////////

async function deployLineaWorldID(config) {
  const spinner = ora("Deploying LineaWorldID on Linea...").start();

  // Check if lineaWorldIDAddress is already in the JSON config
  if (config.lineaWorldIDAddress) {
    spinner.succeed(`LineaWorldID already deployed at ${config.lineaWorldIDAddress}`);
    return;
  }

  try {
    let command = `forge script src/script/DeployLineaWorldID.s.sol:DeployLineaWorldID --fork-url ${config.lineaRpcUrl} --broadcast --json`;
    console.log(command);
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
    spinner.succeed(`LineaWorldID deployed successfully at ${config.lineaWorldIDAddress}`);
  } catch (err) {
    spinner.fail("Failed to deploy LineaWorldID!");
    throw err;
  }
}

// Modified verifyLineaWorldID function
async function verifyLineaWorldID(config) {
  const spinner = ora("Verifying LineaWorldID on Linea...").start();

  try {
    // Get the chain ID
    const chainId = await getChainId(config.lineaRpcUrl);

    // Find the run-latest.json file
    const runLatestJsonPath = path.join(
      "broadcast",
      "DeployLineaWorldID.s.sol",
      chainId.toString(),
      "run-latest.json"
    );

    if (!fs.existsSync(runLatestJsonPath)) {
      spinner.fail(`Could not find deployment file at ${runLatestJsonPath}`);
      return;
    }

    const runData = JSON.parse(fs.readFileSync(runLatestJsonPath, 'utf8'));

    // Now, parse the runData to get the necessary info
    // Since we know only one contract was deployed, we can get the transaction where transactionType is "CREATE"

    const transactions = runData.transactions;
    let contractAddress;
    let contractName;
    let constructorArgs;

    for (const tx of transactions) {
      if (tx.transactionType === "CREATE") {
        contractAddress = tx.contractAddress;
        contractName = tx.contractName;
        // Get the constructor arguments from the input data
        const deployedBytecode = tx.transaction.input; // this is the input data (bytecode + constructor args)
        // Load the compiled bytecode
        const compiledContractPath = path.join("out", `${contractName}.sol`, `${contractName}.json`);
        const compiledContract = JSON.parse(fs.readFileSync(compiledContractPath, 'utf8'));
        let compiledBytecode = compiledContract.bytecode.object;

        // Remove the '0x' prefix
        const compiledBytecodeWithout0x = compiledBytecode.startsWith('0x') ? compiledBytecode.slice(2) : compiledBytecode;
        const deployedBytecodeWithout0x = deployedBytecode.startsWith('0x') ? deployedBytecode.slice(2) : deployedBytecode;

        // The constructor args are the extra bytes in deployedBytecode after the compiled bytecode
        const compiledBytecodeLength = compiledBytecodeWithout0x.length;
        const constructorArgsHex = deployedBytecodeWithout0x.slice(compiledBytecodeLength);
        constructorArgs = '0x' + constructorArgsHex;

        break; // Since we only have one deployment, we can break here
      }
    }

    if (!contractAddress || !contractName) {
      spinner.fail("Could not find contract deployment in transactions");
      return;
    }

    // Now, compose the forge verify-contract command
    let command = `forge verify-contract ${contractAddress} src/LineaWorldID.sol:${contractName} --etherscan-api-key ${config.lineaScanApiKey}`;

    if (constructorArgs && constructorArgs !== '0x') {
      command += ` --constructor-args ${constructorArgs}`;
    }

    // Optionally, add --verifier-url if necessary
    if (config.lineaScanVerifierUrl) {
      command += ` --verifier-url ${config.lineaScanVerifierUrl}`;
    }

    command += ` --watch`;

    console.log(command);

    const output = execSync(command);
    console.log(output.toString());
    spinner.succeed("Verification command ran successfully!");
  } catch (err) {
    spinner.fail("Verification failed!");
    console.error(err);
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
    saveConfiguration(config);
    await deployLineaWorldID(config);
    saveConfiguration(config);
    if (config.lineaScanApiKey) {
      await verifyLineaWorldID(config);
    }
    await getConfigValue(
      config,
      "worldIDIdentityManagerAddress",
      "WORLD_ID_IDENTITY_MANAGER_ADDRESS",
      "Enter WorldID Identity Manager Address: ",
    );
    await getConfigValue(config, "lineaWorldIDAddress", "LINEA_WORLD_ID_ADDRESS", "Enter Linea WorldID Address: ");
    saveConfiguration(config);
    await deployLineaStateBridge(config);
    saveConfiguration(config);
    await getConfigValue(
      config,
      "lineaStateBridgeAddress",
      "LINEA_STATE_BRIDGE_ADDRESS",
      "Enter Linea State Bridge Address: ",
    );
    saveConfiguration(config);
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
      saveConfiguration(config);
    });

  await program.parseAsync();
}

main().then(() => process.exit(0));

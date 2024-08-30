#!/bin/bash

# Define the path to the JSON file
JSON_FILE="./output.json"

# Check if the JSON file exists
if [ ! -f "$JSON_FILE" ]; then
  # If the file doesn't exist, create a new JSON file with the initial data
  echo "{}" > "$JSON_FILE"
  echo "Created new JSON file: $JSON_FILE"
fi

# Initialize default values for variables
path=""
rpc_url=""
chain_id=""
private_key=""
gas_price=""
fork_url=""
broadcast=false
etherscan_api_key=""

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --path) path="$2"; shift;;
        --rpc-url) rpc_url="$2"; shift ;;
        --chain-id) chain_id="$2"; shift;;
        --private-key) private_key="$2"; shift ;;
        --gas-price) gas_price="$2"; shift ;;
        --fork-url) fork_url="$2"; shift ;;
        --broadcast) broadcast=true ;;
        --etherscan-api-key) etherscan_api_key="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$path" ]; then
    echo "Error: --path script path is required but not provided."
    exit 1
elif [ -z "$rpc_url" ] && [ -z "$fork_url" ]; then
    echo "Error: --rpc-url or --fork-url is required but not provided."
    exit 1
fi

# Forge command construction based on the passed arguments
forge_command="forge script $path"

if [ -n "$rpc_url" ]; then
    forge_command="$forge_command --rpc-url $rpc_url"
elif [-n "$fork_url"]; then
    forge_command="$forge_command --fork-url $fork_url"
fi

if [ -n "$chain_id" ]; then
    forge_command="$forge_command --chain-id $chain_id"
fi

if [ -n "$private_key" ]; then
    forge_command="$forge_command --private-key $private_key"
fi

if [ -n "$gas_price" ]; then
    forge_command="$forge_command --gas-price $gas_price"
fi

if [ "$broadcast" = true ]; then
    forge_command="$forge_command --broadcast"
fi

if [ -n "$etherscan_api_key" ]; then
    forge_command="$forge_command --etherscan-api-key $etherscan_api_key"
fi


# Run the constructed Forge command
echo "Running: $forge_command"
output_stream=$(eval "$forge_command")

# Extract the relevant line
deploy_info=$(echo "$output_stream" | grep "Deployed new")

# Extract the contract name and address using awk
contract=$(echo "$deploy_info" | awk -F " " '{print $3}')
address=$(echo "$deploy_info" | awk -F " " '{print $5}')

if [ -z "$contract" ] && [ -z "$address" ]; then
  # Extract the relevant line
  deploy_info=$(echo "$output_stream" | grep "Loaded existing")

  # Extract the contract name and address using awk
  contract=$(echo "$deploy_info" | awk -F " " '{print $3}')
  address=$(echo "$deploy_info" | awk -F " " '{print $5}')
fi

# Print the results
printf "%s\n" "$output_stream"

if [ -n "$contract" ] && [ -n "$address" ]; then
  # Add the new contract and address to the JSON file
  jq --arg contract "$contract" --arg address "$address" '.[$contract] = $address' "$JSON_FILE" > tmp.$$.json && mv tmp.$$.json "$JSON_FILE"

  echo "JSON file updated successfully!"
fi

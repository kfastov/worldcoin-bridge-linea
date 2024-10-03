# worldcoin-bridge-linea

![spec](docs/state-bridge.svg)

## Description

State bridge between the WorldID Ethereum mainnet deployment and Linea. The [spec](./docs/spec.md) can be found in
`docs/spec.md`.

## Deployments

The addresses of the contract deployments for production and staging can be found in
[`docs/deployments.md`](./docs/deployments.md).

## Supported Networks

This repository implements a World ID state bridge specifically for Linea. For context, the original World ID state
bridge supports Polygon PoS and OP stack chains (Optimism and Base), which can be found
[here](https://github.com/worldcoin/world-id-state-bridge). Additionally, there's a standalone bridge similar to this
one for Scroll, available [here](https://github.com/dragan2234/worldcoin-scroll-bridge).

## Prerequisites

This repository uses Bun as a dependency manager, script execution environment and so on. To install Bun, refer to its
[webpage](https://bun.sh/docs/installation). Other commands listed below assume you have Bun installed.

## Documentation

Run `bun doc` to build and deploy a simple documentation webpage on [localhost:3000](https://localhost:3000). Uses
[`forge doc`](https://book.getfoundry.sh/reference/forge/forge-doc#forge-doc) under the hood and sources information
from the `world-id-state-bridge` contracts [NatSpec](https://docs.soliditylang.org/en/latest/natspec-format.html)
documentation.

## Usage

This is a list of the most frequently needed commands.

### Install Dependencies

```sh
bun install
```

### Build

Build the contracts:

```sh
$ forge build
```

### Clean

Delete the build artifacts and cache directories:

```sh
$ forge clean
```

### Coverage

Generate test coverage and output result to the terminal:

```sh
$ bun run test:coverage
```

### Format

Format the contracts with `forge fmt` and the rest of the files (.js, .md) with Prettier:

```sh
bun run format
```

### Gas Usage

Get a gas report:

```sh
bun run snapshot
```

Run gas benchmarks on the tests:

```sh
bun run bench
```

### Lint

Lint the contracts:

```sh
$ bun run lint
```

### Test

Run the tests:

```sh
$ forge test
```

### Deploy

To deploy the contracts to the testnet:

```sh
$ bun run deploy:testnet
```

### Run Root Propagator

To run the root propagator on testnet:

```sh
$ bun run propagator:testnet
```

You can read more about the root propagator [here](./docs/root-propagator.md).

## Contributing

We welcome contributions to improve and expand the functionality of the Worldcoin state bridge for Linea. Please feel
free to open issues or submit pull requests.

## Credits

This repo uses code from the Worldcoin State Bridge for Polygon and Optimism, which can be found
[here](https://github.com/worldcoin/world-id-state-bridge).

This repo uses Paul Razvan Berg's [foundry template](https://github.com/paulrberg/foundry-template/): A Foundry-based
template for developing Solidity smart contracts, with sensible defaults.

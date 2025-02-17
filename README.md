# mongokit

A command line toolkit for interacting with MongoDB.

[Click here to support my work](https://www.codecapers.com.au/about#support-my-work)

## Install

```bash
npm install -g mongokit
```

## Connect your database

There are two options for connecting the mongokit commands to your own database.

### CLI option

Use the option `--uri` and set it to the connection string for your database when running a command.

Example:

```bash
--uri mongodb://localhost:27017
```

### Environment variable

Set the environment variable `MONGO_URI` to the connection string for your database before running commands.

Example:

```bash
export MONGO_URI=mongodb://localhost:27017
```

Or on Windows:

```bash
set MONGO_URI=mongodb://localhost:27017
```

## Run commands

There is a full suite of commands you can run. Here's an example to get a whole collection as JSON data:

```bash
mongokit get collection <collection-name>
```

To see the full list of commands to get and set data:

```bash
mongokit --help
```

## Run commands in development

Clone the repo and then install dependencies:

```bash
cd mongokit
npm install
```

Run commands:

```bash
npx ts-node src/cli.ts get dbs
```
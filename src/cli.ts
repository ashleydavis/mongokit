const { program } = require('commander');
const { version } = require('../package.json');
import { MongoClient, ObjectId } from 'mongodb';
import * as chalk from 'chalk';
import { inputData, outputData } from "datakit/build/lib/io";

//
// Convert the ID to an ObjectID and if not possible just return the id.
//
function tryConvertMongoId(id: string) {
    try {
        return new ObjectId(id);
    }
    catch {
        return id;
    }
}

async function main() {

    program
        .name("mongokit")
        .version(version)
        .description("A command line toolkit for interacting with MongoDB")
        .requiredOption(`--uri <string>`, `Connection string for your MongoDB database. You can also set the environment variable MONGO_URI`, process.env.MONGO_URI)
        ;

    const get = program
        .command("get")
        .alias("g")
        .description("Gets data from the database")

    //
    // Lists all the available databases.
    //
    get.command("databases")
        .alias("dbs")
        .argument("[-|output-file-name]", "The output file (yaml or json) to write data to. Omit or set to a hypen (-) to write JSON data to standard output", "-")
        .description("Gets the list of databases from the server")
        .action(async (outputFileName: string, options: any) => {
            const client = await connect();
            const result = await client.db().admin().listDatabases();
            await outputData([ outputFileName ], result.databases.map(db => db.name));
        });

    //
    // Gets an entire database.
    //
    get.command("database")
        .alias("db")
        .argument("<database>", "The name of the database to retreive")
        .argument("[-|output-file-name]", "The output file (yaml or json) to write data to. Omit or set to a hypen (-) to write JSON data to standard output", "-")
        .description("Gets an entire database from the server")
        .action(async (databaseName: string, outputFileName: string, options: any) => {
            const client = await connect();
            const db = client.db(databaseName);
            const collections = await db.listCollections().toArray();
            const output: any[] = [];
            for (const collection of collections) {
                output.push({
                    name: collection.name,
                    documents: await db.collection(collection.name).find().toArray(),
                });
            }
            await outputData([ outputFileName ], output);
        });

    get.command("collections")
        .alias("cols")
        .argument("<database>", "The name of the database to retreive")
        .argument("[-|output-file-name]", "The output file (yaml or json) to write data to. Omit or set to a hypen (-) to write JSON data to standard output", "-")
        .description("Gets the list of collections from the database")
        .action(async (databaseName: string, outputFileName: string, options: any) => {
            const client = await connect();
            const db = client.db(databaseName);
            const collections = await db.listCollections().toArray();
            await outputData([ outputFileName ], collections.map(collection => collection.name));
        });

    get.command("collection")
        .alias("col")
        .argument("<database>", "The name of the database to retreive")
        .argument("<collection>", "The name of the collection to retreive")
        .argument("[-|output-file-name]", "The output file (yaml or json) to write data to. Omit or set to a hypen (-) to write JSON data to standard output", "-")
        .description("Gets a collection from the database")
        .action(async (databaseName: string, collectionName: string, outputFileName: string, options: any) => {
            const client = await connect();
            const db = client.db(databaseName);
            const collection = db.collection(collectionName);
            const documents = await collection.find().toArray();
            await outputData([ outputFileName ], documents);
        });

    get.command("documents")
        .alias("docs")
        .argument("<database>", "The name of the database to retreive")
        .argument("<collection>", "The name of the collection to retreive")
        .argument("[-|output-file-name]", "The output file (yaml or json) to write data to. Omit or set to a hypen (-) to write JSON data to standard output", "-")
        .description("Gets the list of documents from the collection")
        .action(async (databaseName: string, collectionName: string, outputFileName: string, options: any) => {
            const client = await connect();
            const db = client.db(databaseName);
            const collection = db.collection(collectionName);
            const documents = await collection.find().toArray();
            await outputData([ outputFileName ], documents.map(doc => doc._id));
        });

    get.command("document")
        .alias("doc")
        .argument("<database>", "The name of the database to retreive")
        .argument("<collection>", "The name of the collection to retreive")
        .argument("<document-id>", "The id of the document to retreive")
        .argument("[-|output-file-name]", "The output file (yaml or json) to write data to. Omit or set to a hypen (-) to write JSON data to standard output", "-")
        .description("Gets a document from the database")
        .action(async (databaseName: string, collectionName: string, documentId: string, outputFileName: string, options: any) => {
            const client = await connect();
            const id = tryConvertMongoId(documentId);
            const db = client.db(databaseName);
            const collection = db.collection<any>(collectionName);
            const document = await collection.findOne({ _id: id });
            await outputData([ outputFileName ], document);
        });

    const set = program
        .command("set")
        .alias("s")
        .description(`Adds or replaces documents in the database (${chalk.red(`wipes out documents that are being replaced`)})`);

    set.command("collection")
        .alias("col")
        .option("--drop", "Drops the collection before setting documents", false)
        .argument("<database>", "The name of the database to set")
        .argument("<collection>", "The name of the collection to set")
        .argument("[-|input-file-name]", "The input file (csv, yaml or json) to read data from. Omit or set to a hypen (-) to read JSON data from standard input", "-")
        .description(`Replaces the requested documents in the specified collection (${chalk.red(`wipes out documents that are being replaced`)})`)
        .action(async (databaseName: string, collectionName: string, inputFileName: string, options: any) => {
            const client = await connect();
            const data = await inputData([ inputFileName ]);
            const db = client.db(databaseName);
            const collection = db.collection<any>(collectionName);
            if (options.drop) {
                await collection.drop();
            }
            for (const document of data) {
                const id = tryConvertMongoId(document._id);
                delete document._id;
                await collection.replaceOne(
                    { 
                        _id: id
                    }, 
                    { 
                        ...document 
                    }, 
                    { 
                        upsert: true,
                    }
                );
            }
        });

    set.command("document")
        .alias("doc")
        .argument("<database>", "The name of the database to set")
        .argument("<collection>", "The name of the collection to set")
        .argument("[document-id]", "The id of the document to set")
        .argument("[-|input-file-name]", "The input file (csv, yaml or json) to read data from. Omit or set to a hypen (-) to read JSON data from standard input", "-")
        .description(`Replaces the specified document (${chalk.red(`wipes out the document that is being replaced`)})`)
        .action(async (databaseName: string, collectionName: string, documentId: string, inputFileName: string, options: any) => {
            const client = await connect();
            const data = await inputData([ inputFileName ]);
            const db = client.db(databaseName);
            const collection = db.collection<any>(collectionName);
            const id = tryConvertMongoId(documentId);
            await collection.replaceOne(
                { 
                    _id: id
                }, 
                { 
                    ...data 
                }, 
                { 
                    upsert: true,
                }
            );
        });

    const update = program
        .command("update")
        .alias("u")
        .description(`Updates or adds fields to documents in the database (${chalk.yellow(`wipes out only specified fields, other fields are left untouched`)})`);

    update.command("collection")
        .alias("col")
        .option("--upsert", "Inserts documents if they don't exist", false)
        .description(`Updates or adds fields to each document in the collection (${chalk.yellow(`wipes out only specified fields, other fields are left untouched`)})`);

    update.command("document")
        .alias("doc")
        .option("--upsert", "Inserts the document if it doesn't exist", false)
        .argument("<database>", "The name of the database to update")
        .argument("<collection>", "The name of the collection to update")
        .argument("<document-id>", "The id of the document to update")
        .argument("[-|input-file-name]", "The input file (csv, yaml or json) to read data from. Omit or set to a hypen (-) to read JSON data from standard input", "-")
        .description(`Updates or adds fields to the document (${chalk.yellow(`wipes out only specified fields, other fields are left untouched`)})`)
        .action(async (databaseName: string, collectionName: string, documentId: string, inputFileName: string, options: any) => {
            const client = await connect();
            const data = await inputData([ inputFileName ]);
            const db = client.db(databaseName);
            const collection = db.collection<any>(collectionName);
            const id = tryConvertMongoId(documentId);
            await collection.updateOne(
                { 
                    _id: id
                }, 
                { 
                    $set: data 
                }, 
                { 
                    upsert: !!options.upsert 
                }
            );
        });

    let connection: MongoClient | undefined = undefined;

    //
    // Connects to the requested database.
    //
    async function connect(): Promise<MongoClient> {
        const { uri } = program.opts();
        if (!uri) {
            throw new Error(`Mongo URI must be set using --uri argument or via the MONGO_URI environment variable`);
        }
        connection = await MongoClient.connect(uri);
        return connection;
    }

    //
    // Disconnects the database.
    //
    async function disconnect(): Promise<void> {
        if (connection) {
            await connection.close();
            connection = undefined;
        }
    }

    try {
        await program.parseAsync();
    }
    finally {
        await disconnect();
    }
}

main()
    .catch(err => {
        console.error(`An error occured:`);
        console.error(err);
    });

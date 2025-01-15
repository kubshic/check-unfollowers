import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {
    appName: 'CheckCluster',
};

if (!uri) {
    throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
}

let client;
let clientPromise;

if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().then((client) => {
        console.log('✅ MongoDB connected successfully to:', client.db().databaseName || 'No database set');
        return client;
    });
}

clientPromise = global._mongoClientPromise;

export default clientPromise;

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI; // MongoDB URI 환경 변수
const options = {};

if (!uri) {
    throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
}

let client;
let clientPromise;

// 클라이언트 연결 설정
if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client
        .connect()
        .then((connectedClient) => {
            console.log('✅ MongoDB 연결 성공');
            return connectedClient; // MongoDB 클라이언트 반환
        })
        .catch((error) => {
            console.error('❌ MongoDB 연결 실패:', error);
            throw error;
        });
}

clientPromise = global._mongoClientPromise;

export default clientPromise;

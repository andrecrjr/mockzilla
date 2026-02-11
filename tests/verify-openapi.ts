import { isOpenApiFormat, convertOpenApiToMockzilla } from '../lib/openapi-import';
import fs from 'fs';

const sample = JSON.parse(fs.readFileSync('./tests/sample-openapi.json', 'utf8'));

if (isOpenApiFormat(sample)) {
    console.log('✅ Format is valid OpenAPI');
    const data = await convertOpenApiToMockzilla(sample);
    console.log('✅ Conversion successful:');
    console.log(`Folders: ${data.folders.length}`);
    console.log(`Mocks: ${data.mocks.length}`);
    
    // Check specific mock
    const petMock = data.mocks.find(m => m.path === '/pets' && m.method === 'GET');
    if (petMock) {
        console.log('✅ Found /pets GET mock');
        console.log('Response preview:', petMock.response.substring(0, 50) + '...');
        console.log('Uses dynamic response:', petMock.useDynamicResponse);
    } else {
        console.error('❌ Could not find /pets GET mock');
    }

    const petIdMock = data.mocks.find(m => m.path === '/pets/{petId}');
    if (petIdMock) {
        console.log('✅ Found /pets/{petId} mock');
    } else {
        console.error('❌ Could not find /pets/{petId} mock');
    }

} else {
    console.error('❌ Format is NOT valid OpenAPI');
    process.exit(1);
}


export async function handler(event:any, context:any, callback:any) {

  // dependencies work as expected
  console.log('oh hi')

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };

  callback(null, response);
}
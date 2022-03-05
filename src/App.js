import React, { useState, useEffect } from 'react';
import Camera, { FACING_MODES} from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import { BlobServiceClient } from '@azure/storage-blob';
import { Buffer } from 'buffer';
import{ SyncClient } from 'twilio-sync';
import axios from 'axios';
import async from 'async';
import { Button, Typography, Box } from '@mui/material';

const ComputerVisionClient = require('@azure/cognitiveservices-computervision').ComputerVisionClient;
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;

const printedTextSampleURL = '' //Path to your azure blob storage file
const containerName = ``//Your container name
const sasToken = '' //Your sas token from azure;
const storageAccountName = ''// your azure account name; 
const blobServiceClient = new BlobServiceClient(`https://${storageAccountName}.blob.core.windows.net${sasToken}`)
const key = '' //Your azure key;
const endpoint = '' //your cognitative services instance endpoint;
const syncTokenEndpoint = '' //the URL for a twilio function that returns a sync token;
const credentials = new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } })
const computerVisionClient = new ComputerVisionClient(credentials, endpoint);
const phoneNumber = "tel:+61480017680" //your twilio phone number precceded with tel:


function App (props) {

  const [syncToken, setSyncToken] = useState(null);
  const [syncClient, setSyncClient] = useState(null);
  const [imageUploaded, setImageUploaded] = useState(null);
  const [ocrStatus, setOcrStatus] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [ syncUpdated, setSyncUpdated ] = useState(null);

  useEffect(() => {
    getSyncToken()
  }, []);

  async function getSyncToken() {
    try {
        const response = await axios.get(syncTokenEndpoint);
        let token = response.data;
        setSyncToken(token);
        // console.log('token is: ' + token);
        setSyncClient(new SyncClient(token));

      } catch (error) {
        console.error(error);
      }

  }
  async function upload(dataUri) {
    const containerClient = blobServiceClient.getContainerClient(containerName);  
    const encodedImage = dataUri.split(',')[1];
    const byteCharacters = new Buffer.from(encodedImage, 'base64');    
    const options = {"blobHTTPHeaders": { "blobContentType": "image/png"}};
    const blobName = "test.png";
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const uploadBlobResponse = await blockBlobClient.upload(byteCharacters, byteCharacters.length, options);
    setImageUploaded('Complete');
    console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse);
    computerVision();
  }

  const wait = (timeout) => {
    return new Promise(resolve => {
        setTimeout(resolve, timeout);
    });
  }

  function computerVision() {
    async.series([ 
      async function () {
        
        // Status strings returned from Read API. NOTE: CASING IS SIGNIFICANT.
        // Before Read 3.0, these are "Succeeded" and "Failed"
        const STATUS_SUCCEEDED = "succeeded";
        const STATUS_FAILED = "failed"

        // Recognize text in printed image from a URL
        console.log('Read printed text from URL...', printedTextSampleURL.split('/').pop());
        const printedResult = await readTextFromURL(computerVisionClient, printedTextSampleURL);
        // console.log('finished waiting for readTextFromURL');
        printRecText(printedResult);

        // Perform read and await the result from URL
        async function readTextFromURL(client, url) {
          // console.log('starting readTextFromURL');
            // To recognize text in a local image, replace client.read() with readTextInStream() as shown:
            let result = await client.read(url);
            setOcrStatus(result.status);
            // console.log('finished waiting for client.read result');
            // Operation ID is last path segment of operationLocation (a URL)
            let operation = result.operationLocation.split('/').slice(-1)[0];
            while (result.status !== STATUS_SUCCEEDED) { await wait(1000); result = await client.getReadResult(operation); }
            setOcrStatus(result.status);
            // Return the first page of result. Replace [0] with the desired page if this is a multi-page file such as .pdf or .tiff.
            return result.analyzeResult.readResults;
        }
        // Prints all text from Read result
        function printRecText(readResults) {
            console.log('Recognized text:');
            for (const page in readResults) {
            if (readResults.length > 1) {
                console.log(`==== Page: ${page}`);
            }
            const result = readResults[page];
            if (result.lines.length) {
                let charSequence = []
                let dummyString
                for (const line of result.lines) {
                    let character =  line.text.toUpperCase()
                    character = character.replace(/[^a-z]+/gi, '');
                    // let character =  line.text
                    // character = character.replace(/[^a-z ]+$/gi, ' ');
                    charSequence.push(character)
                    setOcrResult(charSequence.join(' '))
                    // charSequence = charSequence.concat(" " + line.text)
                    // setOcrResult(charSequence);
                }
                let syncUpdate = {"characters": charSequence}
                console.log(syncUpdate)
                // Open a Document by unique name and update its data
                syncClient.document('characters')
                    .then(function(document) {
                        // Update the Document data
                        return document.set(syncUpdate);
                    })
                    .then(function(updateResult) {
                      
                        return setSyncUpdated('Done!');
                    })
                    .catch(function(error) {
                        console.error('Unexpected error', error)
                    });
            }
            else { 
              console.log('No recognized text.');
              setOcrResult('No recognized text.');
            }
          }
        } 
    },
    function () {
      return new Promise((resolve) => {
        resolve();
      })
    }
  ], (err) => {
    throw (err);
  });
}


  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>   
      <div className="camera">
        <Camera
          onTakePhoto = { (dataUri) => { upload(dataUri); } } 
          isImageMirror = {false}
          idealFacingMode = {FACING_MODES.ENVIRONMENT}
        />  
      </div>
      <div className='status' style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '30px'}}>
        { !ocrResult ? <Typography variant="subtitle1" gutterBottom component="div">Take a photo of some text to continue</Typography> : <a href={phoneNumber}><Button variant='contained'> Dial to Hear results </Button></a> }
        <br/>
        {/* { !syncToken ? <p>Sync Token: Fetching</p> : <p>Sync Token:  Done!</p>}
        { !syncClient ? <p>Sync Client State: Not running</p> : <p>Sync Client State:  Running</p>}
        <p>Image Upload: {imageUploaded}</p>
        <p>Image Processing: {ocrStatus}</p>
        <p>Sync Doc Update: {syncUpdated}</p> */}
        { !ocrResult ? <></> : <Typography variant="subtitle1" gutterBottom component="div">Detected Text:</Typography> }
        <Typography variant="body1" gutterBottom component="div">{ocrResult}</Typography>
      </div>   
    </div>
  );
}

export default App;
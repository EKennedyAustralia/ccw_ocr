This code is useless to you without the following:

A Twilio project with
- A sync doc in the default service called 'ocr'
- A public Twilio function that returns a sync token (not in JSON - just the token as the whole response) with permissions scoped to the above service
- Flex is provisioned and is runnin this plugin - https://github.com/EKennedyAustralia/plugin-ccw
- A studio flow or TWML that directs calls based in the values found in the SynCDoc - i.e.e just <SAY> the value or whatever logic you want
  
An Azure account with the following
  - Azure storgae blob container set up with permission to upload from a web clientvinc API key, container ID etc
  - A cognitative services resource group with Optical character Recogintion resource enabled and the approprite keys for that
  
  
  
  Effectively if you have ALL of the above set up then you can input your own keys into this mobile site and host it via NGROK or on Firebase
  
  Accessing this site will then allow your iPhone to take an image from the rear camera - that image will be sent to azure as a binary storage blob. 
  The azure cognitave servies API will perform OCR and find any printed text in the image
  The web app will receive back the text from OCR and jam it into your sync doc
  Pressing the dial button will make your phone call your twilio number and your studio flow can then thest the value of the sync doc to perform your business logic and the flex plugin will display the photo you took



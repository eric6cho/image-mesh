# Image Mesh Server

An image editor api that takes images as an input and can generate the following:
- a square cropped image
- an edited image
- a pixel art version of the image
- a randomly generated pixel map of an image's color palette
- a randomly generated gradient of an image's color palette
- rgb values of an image's color palette
- css styling of an image's color palette and gradient

## Deployed Application

This application is deployed and hosted on Heroku and can be viewed 
[here](https://image-mesh-server.herokuapp.com/).

Since this is a server without an interface, an app using this api can be viewed 
[here](https://image-mesh.herokuapp.com/).

## Available Scripts

All scripts below are run from the project directory.

### Run the Node.js server

`npm start`

This will start the Node.js server on port 5000.

## Deploying The Project

The deployed project is based on the `main` branch, and a new deployment occurs when updates are pushed onto the `main` branch.

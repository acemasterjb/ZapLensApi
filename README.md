# ZapMaster REST API
This repository allows you to create a local API for ZapMaster information. 

## To test:

Requirements: Node.js version 9.2.0

1. Clone the repository
2. Create a .env file based on the example (update the nodeURLTestnet)
3. Run:

```node
	npm install
	node index
```
or with nodemon for reload on file changes.
```
nodemon index.js
```

To update the contracts ABI
```bash
    make generate
```

4. Now visit these urls from your browser:
 >Each end point also accepts the network name as an optional parameter:<br/>
 When not provided it defaults to `mainnet`.<br/>
 `.../testnet/info` - connects to testnet <br/>
`.../info` connects to `mainnet`

* General information:		http://localhost:5000/chainName/info
* Current variables:		http://localhost:5000/chainName/currentVariables
* Dispute Fees:		http://localhost:5000/chainName/getDisputeFee
* Request queue: http://localhost:5000/requestq
* QequestId (api, granularity, etc..): http://localhost:5000/requestinfo/requestID
    * For example: http://localhost:5000/requestinfo/1
* Price inforamtion for specified requestId: http://localhost:5000/price/requestID/count
    * For example: http://localhost:5000/price/1/10<br/>
    Count is optional and defines how many historical values to return. When omitted it returns the most recent value.
* Dispute inforamtion for a specific disputeId:  http://localhost:5000/dispute/:disputeID

## Custom API 
Use the following hashes to read data from ZapMaster's contract.
https://docs.ZapMaster.io/ZapMaster/integration/reference-page/variable-hashes
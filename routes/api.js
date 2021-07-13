const express = require('express')
const router = express.Router();
var Web3 = require('web3');
var fs = require('fs');
var web3, ZapMaster, ZapMaster, Aggregator

function useNetwork(netName, res) {
	// "Web3.providers.givenProvider" will be set if in an Ethereum supported browser.
	try {
		console.log(process.cwd())
		const masterABI = JSON.parse(fs.readFileSync("contracts/ZapMaster.json"));
		const lensABI = JSON.parse(fs.readFileSync("contracts/Aggregator.json"));
		var currentProvider = new Web3.providers.HttpProvider('https://data-seed-prebsc-1-s1.binance.org:8545/')

		switch (netName) {
			case "localhost":
				web3 = new Web3(currentProvider);
				ZapMaster = new web3.eth.Contract(masterABI, '0x2Aa47ebfc8D05866242a2a83ea9Be994Ae3E59a8');
				Aggregator = new web3.eth.Contract(lensABI, '0xa5543465883092C825D12698473838B50d84639f');
				break;
			case "testnet":
				web3 = new Web3(currentProvider);
				ZapMaster = new web3.eth.Contract(masterABI, '0xf8349760504C20cD1A454041F1B11e6B51Db2ca7');
				Aggregator = new web3.eth.Contract(lensABI, '0x993C1EE9058186133974AA6e865E3Fe2D2A2B521');
				break;
			default:
				netName = "mainnet"
				web3 = new Web3(currentProvider);
				ZapMaster = new web3.eth.Contract(masterABI, '0xBB1EbB02C6fD085B29f51a4817AA82030f17A3D6');
				Aggregator = new web3.eth.Contract(lensABI, '0xD2d710c0fA58dc1d1433d0D175FFCFc77eBdC61F');
		}
		console.log("using network:", netName)
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
}

function processInput(filename, json) {
	fs.open(filename, 'a', function (e, id) {
		if (e != null) {
			console.log("open stats file for appending", e)
			return
		}
		fs.write(id, json + "\n", null, 'utf8', function () {
			fs.close(id, function () {
				console.log('file is updated');
			});
		});
	});
}

// Get general ZapMaster state data and saves the data under data/state.json
router.get('/:netName?/info', async function (req, res) {
	try {
		useNetwork(req.params.netName, res)
		console.log('getting all variable information...')
		//read data from ZapMaster's contract
		var _stakerCount = await ZapMaster.methods.getUintVar(web3.utils.keccak256("stakerCount")).call();
		var _difficulty = await ZapMaster.methods.getUintVar(web3.utils.keccak256("difficulty")).call();
		var _currentRequestId = await ZapMaster.methods.getUintVar(web3.utils.keccak256("currentRequestId")).call();
		var _disputeCount = await ZapMaster.methods.getUintVar(web3.utils.keccak256("disputeCount")).call();
		var _totalSupply = await ZapMaster.methods.getUintVar(web3.utils.keccak256("total_supply")).call();
		var _timeOfLastValue = await ZapMaster.methods.getUintVar(web3.utils.keccak256("timeOfLastNewValue")).call();
		var _requestCount = await ZapMaster.methods.getUintVar(web3.utils.keccak256("requestCount")).call();
		var _slotProgress = await ZapMaster.methods.getUintVar(web3.utils.keccak256("slotProgress")).call();
		res.send({
			stakerCount: _stakerCount,
			difficulty: _difficulty,
			currentRequestId: _currentRequestId,
			disputeCount: _disputeCount,
			total_supply: _totalSupply,
			timeOfLastNewValue: _timeOfLastValue,
			requestCount: _requestCount,
			slotProgress: _slotProgress
		})

		//Allows user to save the API data requested to a file under the data folder
		let _now = Date.now();
		var state = "state";
		state = {
			timeChecked: _now,
			stakerCount: _stakerCount,
			difficulty: _difficulty,
			currentRequestId: _currentRequestId,
			disputeCount: _disputeCount,
			total_supply: _totalSupply,
			timeOfLastNewValue: _timeOfLastValue,
			requestCount: _requestCount
		}
		var jsonStats = JSON.stringify(state);
		let filename = "public/state.json";
		processInput(filename, jsonStats);
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
})

//Get data for as specific price request
router.get('/:netName?/price/:requestID/:count?', async function (req, res) {
	try {
		useNetwork(req.params.netName, res)
		var reqCount = req.params.count
		// reqCount is optional so set to 1 when undefined.
		if (reqCount == undefined) {
			reqCount = 1
		}
		var reqID = req.params.requestID
		console.log('getting last', reqCount, 'prices for request ID', reqID);

		var r = await Aggregator.methods.getLastValues(reqID, reqCount).call()
		var results = [];
		for (let index = 0; index < r.length; index++) {
			results.push({
				timestamp: r[index].timestamp,
				value: r[index].value,
			})
		};
		res.send(results);
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
})

//Get latest data for all data IDs
router.get('/:netName?/prices/:count?', async function (req, res) {
	try {
		useNetwork(req.params.netName, res)
		var reqCount = req.params.count
		// reqCount is optional so set to 1 when undefined.
		if (reqCount == undefined) {
			reqCount = 1
		}

		console.log('getting last', reqCount, 'prices for for all data IDs');

		var r = await Aggregator.methods.getLastValuesAll(reqCount).call()
		var results = [];
		for (let index = 0; index < r.length; index++) {
			if (+r[index].value != 0) {
				var ts = r[index].timestamp;
				var reqID = r[index].id;
				var minedBlock = await ZapMaster.methods.getMinedBlockNum(reqID, ts).call();
				results.push({
					timestamp: r[index].timestamp,
					blockNumber: minedBlock,
					value: +r[index].value / +r[index].meta.granularity,
					name: r[index].meta.name,
					id: r[index].meta.id,
					tip: r[index].tip,
				})
			}

		};
		res.send(results);
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
})

//Get data for a specific dispute
router.get('/:netName?/dispute/:disputeID', async function (req, res) {
	try {
		useNetwork(req.params.netName, res)
		console.log('getting dispute info...', req.params.disputeID);
		var _returned = await ZapMaster.methods.getAllDisputeVars(req.params.disputeID).call();
		res.send({
			hash: _returned[0],
			executed: _returned[1],
			disputeVotePassed: _returned[2],
			isPropFork: _returned[3],
			reportedMiner: _returned[4],
			reportingParty: _returned[5],
			proposedForkAddress: _returned[6],
			requestID: _returned[7][0],
			timestamp: _returned[7][1],
			value: _returned[7][2],
			minExecutionDate: _returned[7][3],
			numberOfVotes: _returned[7][4],
			blockNumber: _returned[7][5],
			minerSlot: _returned[7][6],
			quorum: _returned[7][7],
			fee: _returned[7][8],
			tally: _returned[8]
		})
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
})


//Get data for a specific dispute
router.get('/:netName?/requestq', async function (req, res) {
	try {
		useNetwork(req.params.netName, res)
		console.log('getting requestq...');
		var _returned = await ZapMaster.methods.getRequestQ().call();
		res.send({
			requestq: _returned
		})
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
})

//Get data for information about the specified requestID
router.get('/:netName?/requestinfo/:requestID', async function (req, res) {
	try {
		useNetwork(req.params.netName, res)
		console.log('getting requestID information...', req.params.requestID);
		var _returned = await ZapMaster.methods.getRequestVars(req.params.requestID).call();
		var totalCount = await ZapMaster.methods.getNewValueCountbyRequestId(req.params.requestID).call();
		var ts = await ZapMaster.methods.getTimestampbyRequestIDandIndex(req.params.requestID, totalCount - 1).call();
		var value = await ZapMaster.methods.retrieveData(req.params.requestID, ts).call();
		res.send({
			queryString: _returned[0],
			dataSymbol: _returned[1],
			queryHash: _returned[2],
			granularity: _returned[3],
			requestQPosition: _returned[4],
			totalTip: _returned[5],
			timestamp: ts,
			value: value,
		})
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
})

// Get data for information about the specified requestID
// challenge, currentRequestId, level of difficulty, api/query string, and granularity(number of decimals requested), total tip for the request
router.get('/:netName?/currentVariables', async function (req, res) {
	try {
		useNetwork(req.params.netName, res)
		let variables = await ZapMaster.methods.getCurrentVariables().call();
		res.send({ variables })
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
})

router.get('/:netName?/getDisputeFee', async function (req, res) {
	try {
		useNetwork(req.params.netName, res)
		let disputeFee = await ZapMaster.methods.getUintVar(web3.utils.keccak256('_DISPUTE_FEE')).call();
		res.send({ disputeFee })
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
})

router.get('/:netName?/getMiners/:requestID/:timestamp', async function (req, res) {
	try {
		useNetwork(req.params.netName, res)
		let data = await ZapMaster.methods.getMinersByRequestIdAndTimestamp(req.params.requestID, req.params.timestamp).call();
		res.send(data)
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
})

//Get data for a specific dispute
router.get('/:netName?/getStakerInfo/:address', async function (req, res) {
	try {
		useNetwork(req.params.netName, res)
		var resp = await ZapMaster.methods.getStakerInfo(req.params.address).call();
		res.send({
			status: resp[0],
			stakeDate: resp[1],
		})
	} catch (e) {
		let err = e.message
		res.send({ err });
	}
})


module.exports = router;
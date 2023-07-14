const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
app.use(express.json());

const dpPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializationServerAndDataBase = async () => {
  try {
    db = await open({
      filename: dpPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Running Server at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
  }
};

initializationServerAndDataBase();

const convertDBObjIntoResponseObj = (dbObj) => {
  return {
    stateId: dbObj.state_id,
    stateName: dbObj.state_name,
    population: dbObj.population,
  };
};

const convertDistrictNames = (dbObj) => {
  return {
    districtId: dbObj.district_id,
    districtName: dbObj.district_name,
    stateId: dbObj.state_id,
    cases: dbObj.cases,
    cured: dbObj.cured,
    active: dbObj.active,
    deaths: dbObj.deaths,
  };
};

const statistics = (dbObj) => {
  return {
    totalCases: dbObj.cases,
    totalCured: dbObj.cured,
    totalActive: dbObj.active,
    totalDeaths: dbObj.deaths,
  };
};

// API 1 GET Method Returns a list of all states in the state table
app.get("/states/", async (request, response) => {
  const getStatesList = `
    SELECT * FROM state;
    `;
  const stateList = await db.all(getStatesList);
  response.send(stateList.map((each) => convertDBObjIntoResponseObj(each)));
});

// API 2 GET Method Returns a state based on the state ID
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateNameQuery = `
  SELECT * FROM state WHERE state_id = '${stateId}';
  `;
  let dbResponse = await db.get(getStateNameQuery);
  response.send(convertDBObjIntoResponseObj(dbResponse));
});

// API 3 POST Method Create a district in the district table, district_id is auto-incremented
app.post("/districts/", async (request, response) => {
  const newDistrictDet = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = newDistrictDet;

  const postQuery = `
  INSERT INTO
  district (district_name, state_id, cases, cured, active, deaths)
  VALUES (
      '${districtName}',
      '${stateId}',
      '${cases}',
      '${cured}',
      '${active}',
      '${deaths}');`;

  let dbResponse = await db.run(postQuery);
  response.send("District Successfully Added");
});

// API 4 GET Returns a district based on the district ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const getDistrictBasedOnID = `
    SELECT * FROM district WHERE district_id = '${districtId}';
    `;
  const dbResponse = await db.get(getDistrictBasedOnID);
  response.send(convertDistrictNames(dbResponse));
});

// API 5 Deletes a district from the district table based on the district ID
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const deleteQuery = `
    DELETE FROM district WHERE district_id = '${districtId}';
    `;
  await db.run(deleteQuery);
  response.send("District Removed");
});

// API 6 Updates the details of a specific district based on the district ID
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const updatedDetails = request.body;

  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = updatedDetails;

  const updateQuery = `
    UPDATE district 
    SET 
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}'
    WHERE district_id = '${districtId}';
    `;
  await db.run(updateQuery);
  response.send("District Details Updated");
});

// API 7 Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;

  const getStatistics = `
    SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM district
    WHERE state_id = ${stateId};
    `;
  let dbResponse = await db.get(getStatistics);
  console.log(dbResponse);
  response.send({
    totalCases: dbResponse["SUM(cases)"],
    totalCured: dbResponse["SUM(cured)"],
    totalActive: dbResponse["SUM(active)"],
    totalDeaths: dbResponse["SUM(deaths)"],
  });
});

// API 8 GET Method Returns an object containing the state name of a district based on the district ID
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;

  const stateIdQuery = `
    SELECT * from district WHERE district_id = '${districtId}';
    `;
  let dbResponse = await db.get(stateIdQuery);
  let stateId = dbResponse.state_id;

  let stateName = `
  SELECT state_name FROM state WHERE state_id = '${stateId}'
  `;
  let dbResponse2 = await db.get(stateName);
  response.send(convertDBObjIntoResponseObj(dbResponse2));
});

module.exports = app;

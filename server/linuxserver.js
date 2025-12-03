const express = require('express');
const cors = require("cors")
const port =80;
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '13.200.130.74',
  user: 'admin',
  password: 'gqKVadnrWo7HG1GZbV43',
  database: 'world',
});

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Get upcoming matches using promises
app.get('/user/matches', async (req, res) => {
  const query = 'SELECT (select team_name from teams where matches.teamA_id=teams.team_id) as teamA,(select team_name from teams where matches.teamB_id=teams.team_id) as teamB,time,venue,format,match_id FROM matches  where time>=current_timestamp order by time asc '; // Adjust the query based on your database schema

  try {
    const [results] = await pool.query(query);
    res.json(results);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).send('Internal Server Error');
  }
});

process.on('SIGINT', () => {
  pool.end();
  process.exit();
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

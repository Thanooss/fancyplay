const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const cors = require("cors");
const bcrypt = require("bcrypt");
const port = 3001;
const bodyParser = require('body-parser');



app.use(cors());
app.use(bodyParser.json());

// Configure MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Stoner@69',
  database: 'world'
});

// Define API endpoint to fetch matches
app.get('/user/matches', async (req, res) => {
  const query = 'SELECT (select team_name from teams where matches.teamA_id=teams.team_id) as teamA,(select team_name from teams where matches.teamB_id=teams.team_id) as teamB,time,venue,format,match_id FROM matches  where time>=current_timestamp order by time asc';

  try {
    const [results] = await pool.query(query);
    res.json(results);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/register', async (req, res) => {
  const { fullname, mobile, email, password, username } = req.body;
  const encryptedpassword = bcrypt.hashSync(password, 6);

  if (!fullname || !mobile || !email || !password || !username) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const registerQuery = 'INSERT INTO users (fullname, mobile, email, password, username) VALUES (?, ?, ?, ?, ?)';
  const values = [fullname, mobile, email, encryptedpassword, username];

  try {
    const [registerResults] = await pool.query(registerQuery, values);
    const [user] = await pool.query("SELECT * FROM users WHERE user_id=?", [registerResults.insertId]);
    if (user.length == 0) {
      res.status(404).json({ message: "User not found" });
    } else {
      res.status(200).json(user[0]);
    }
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/user/matches/save-team', async (req, res) => {
  const { player_Ids, match_id, user_id } = req.body;

  if (!Array.isArray(player_Ids) || player_Ids.length != 11) {
    return res.status(400).send("player ids must be an array of 11 ids");
  }

  try {
    const [user_team] = await pool.query('SELECT * FROM user_teams WHERE user_id=? AND match_id=?', [user_id, match_id]);

    if (user_team.length > 0) {
      const [existingTeams] = await pool.query('SELECT player1_id, player2_id, player3_id, player4_id, player5_id, player6_id, player7_id, player8_id, player9_id, player10_id, player11_id FROM user_teams WHERE user_id=? AND match_id=?', [user_id, match_id]);

      const currentTeamSorted = player_Ids.sort((a, b) => a - b);

      for (const team of existingTeams) {
        const existingTeam = [
          team.player1_id, team.player2_id, team.player3_id, team.player4_id, team.player5_id,
          team.player6_id, team.player7_id, team.player8_id, team.player9_id, team.player10_id, team.player11_id
        ].sort((a, b) => a - b);

        if (arraysAreEqual(existingTeam, currentTeamSorted)) {
          return res.status(400).send('Duplicate team found');
        }
      }
    }

    saveTeam();

    function arraysAreEqual(arr1, arr2) {
      if (arr1.length != arr2.length) {
        return false;
      }
      for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] != arr2[i]) {
          return false;
        }
      }
      return true;
    }

    async function saveTeam() {
      const [result] = await pool.query('SELECT username FROM users WHERE user_id=?', [user_id]);

      if (result.length <= 0) {
        return res.status(404).send("Username not found");
      }

      const team_name = result[0].username;

      const query = 'SELECT team_name FROM user_teams WHERE user_id=? AND match_id=?';
      const [existingTeams] = await pool.query(query, [user_id, match_id]);

      let maxSuffix = 0;
      existingTeams.forEach(team => {
        const match = team.team_name.match(/\((\d+)\)$/);
        if (match) {
          const suffix = parseInt(match[1], 10);
          if (suffix > maxSuffix) {
            maxSuffix = suffix;
          }
        }
      });

      const newTeamName = `${team_name}(${maxSuffix + 1})`;

      const insertQuery = "INSERT INTO user_teams (user_id, match_id, team_name, player1_id, player2_id, player3_id, player4_id, player5_id, player6_id, player7_id, player8_id, player9_id, player10_id, player11_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
      const values = [user_id, match_id, newTeamName, ...player_Ids];

      const [insertResult] = await pool.query(insertQuery, values);
      const [teamResult] = await pool.query('SELECT uteam_id FROM user_teams WHERE user_id=? ORDER BY uteam_id DESC LIMIT 1', [user_id]);

      if (!teamResult || teamResult.length === 0) {
        return res.status(404).send("uteam_id not found");
      }
      res.status(200).send(teamResult[0]);
    }
  } catch (error) {
    console.error('Error while saving the team:', error);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/user/:user_id', async (req, res) => {
  const requser_id = req.params.user_id;
  const query = `SELECT * FROM users WHERE user_id=${requser_id}`;

  try {
    const [results] = await pool.query(query);

    if (results.length == 0) {
      res.status(404).json({ message: "User not found" });
    } else {
      res.json(results[0]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/user/matches/players/:match_id', async (req, res) => {
  const matchId = req.params.match_id;
  const query = `
  SELECT DISTINCT player_id, src, name, credits, role, Isselected, currentpoints, teams.team_name, matches.teamA_id, matches.teamB_id, players.team_id 
  FROM matches 
  JOIN teams ON matches.teamA_id = teams.team_id 
  WHERE matches.match_id=?`;

  try {
    const [results] = await pool.query(query, [matchId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

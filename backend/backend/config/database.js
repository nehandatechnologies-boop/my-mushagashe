const db = require('../database/init');

// Database query helpers
const dbHelpers = {
  // Generic query helper
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Get single row
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Run query (INSERT, UPDATE, DELETE)
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  // Execute multiple queries in transaction
  transaction: async (queries) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const results = [];
        let error = null;
        
        let i = 0;
        const executeNext = () => {
          if (i >= queries.length || error) {
            if (error) {
              db.run('ROLLBACK');
              reject(error);
            } else {
              db.run('COMMIT');
              resolve(results);
            }
            return;
          }

          const { sql, params } = queries[i];
          db.run(sql, params, function(err) {
            if (err) {
              error = err;
            } else {
              results.push({ id: this.lastID, changes: this.changes });
            }
            i++;
            executeNext();
          });
        };

        executeNext();
      });
    });
  }
};

module.exports = dbHelpers;

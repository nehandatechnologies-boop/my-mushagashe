const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'mushagashe.db');
const db = new Database(dbPath);

try {
  console.log('Adding dashboard.view permission to RBAC schema...');

  // Add the dashboard.view permission
  const insertPermission = db.prepare(`
    INSERT INTO permissions (name, description, category)
    VALUES ('dashboard.view', 'View dashboard and statistics', 'dashboard')
    ON CONFLICT (name) DO NOTHING
  `);
  const result = insertPermission.run();
  console.log(`Permission insert result: ${JSON.stringify(result)}`);

  // Get the permission ID
  const permission = db.prepare('SELECT id FROM permissions WHERE name = ?').get('dashboard.view');
  console.log(`dashboard.view permission ID: ${permission ? permission.id : 'not found'}`);

  if (permission) {
    // Assign to SUPER_ADMIN (already has all permissions via CROSS JOIN in schema)
    console.log('SUPER_ADMIN automatically gets all permissions via existing schema');

    // Assign to ACADEMIC_ADMIN
    const academicRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('ACADEMIC_ADMIN');
    if (academicRole) {
      const assignAcademic = db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (?, ?)
        ON CONFLICT DO NOTHING
      `);
      assignAcademic.run(academicRole.id, permission.id);
      console.log('Assigned dashboard.view to ACADEMIC_ADMIN');
    }

    // Assign to FINANCE_ADMIN
    const financeRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('FINANCE_ADMIN');
    if (financeRole) {
      const assignFinance = db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (?, ?)
        ON CONFLICT DO NOTHING
      `);
      assignFinance.run(financeRole.id, permission.id);
      console.log('Assigned dashboard.view to FINANCE_ADMIN');
    }

    // Assign to ADMISSIONS_ADMIN
    const admissionsRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('ADMISSIONS_ADMIN');
    if (admissionsRole) {
      const assignAdmissions = db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (?, ?)
        ON CONFLICT DO NOTHING
      `);
      assignAdmissions.run(admissionsRole.id, permission.id);
      console.log('Assigned dashboard.view to ADMISSIONS_ADMIN');
    }

    // Assign to LECTURER_ADMIN
    const lecturerRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('LECTURER_ADMIN');
    if (lecturerRole) {
      const assignLecturer = db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (?, ?)
        ON CONFLICT DO NOTHING
      `);
      assignLecturer.run(lecturerRole.id, permission.id);
      console.log('Assigned dashboard.view to LECTURER_ADMIN');
    }
  }

  // Verify the permission was added
  const verify = db.prepare(`
    SELECT p.name, p.description, p.category,
           GROUP_CONCAT(r.name) as roles
    FROM permissions p
    LEFT JOIN role_permissions rp ON p.id = rp.permission_id
    LEFT JOIN roles r ON rp.role_id = r.id
    WHERE p.name = 'dashboard.view'
    GROUP BY p.id
  `).get();

  console.log('\nVerification:');
  console.log(JSON.stringify(verify, null, 2));

  console.log('\nDashboard permission migration completed successfully!');
} catch (error) {
  console.error('Error during migration:', error);
  process.exit(1);
} finally {
  db.close();
}

/**
 * Test announcement deletion functionality
 */

const Announcement = require('./models/Announcement');

async function testAnnouncementDeletion() {
  console.log('=== TESTING ANNOUNCEMENT DELETION ===\n');

  // First, get current announcements
  console.log('1. GETTING CURRENT ANNOUNCEMENTS...');
  const currentAnnouncements = await Announcement.findAll({});
  console.log('Current announcements:', currentAnnouncements.map(a => ({ id: a.id, title: a.title })));

  // Test deleting announcement ID 10
  const targetId = 10;
  console.log(`\n2. DELETING ANNOUNCEMENT ID ${targetId}...`);

  try {
    const result = await Announcement.delete(targetId);
    console.log('Delete result:', result);

    // Verify deletion
    console.log('\n3. VERIFYING DELETION...');
    const afterDelete = await Announcement.findAll({});
    console.log('Announcements after deletion:', afterDelete.map(a => ({ id: a.id, title: a.title })));

    const deletedAnnouncement = afterDelete.find(a => a.id === targetId);
    if (deletedAnnouncement) {
      console.log('❌ ERROR: Announcement ID 10 still exists after deletion');
    } else {
      console.log('✅ SUCCESS: Announcement ID 10 successfully deleted');
    }

  } catch (error) {
    console.error('Delete error:', error.message);
    console.error('Error details:', error.code, error.details);
  }

  console.log('\n=== TEST COMPLETE ===');
}

testAnnouncementDeletion().catch(console.error);

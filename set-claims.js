const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'shifttrack-prod'
});

async function setClaims() {
  const uids = {
    balaria: 'yD82roieZ1SenZ23Fpk53yI2S9H2',
    mochia: 'tpQjQILOWKaG99ObhxGJdViy7Cx2',
    office: '7443xhlAYhaH4SpsNvQMIUkIs5O2'
  };

  try {
    await admin.auth().setCustomUserClaims(uids.balaria, { mineId: 'balaria' });
    console.log('✅ Balaria claims set');
    
    await admin.auth().setCustomUserClaims(uids.mochia, { mineId: 'mochia' });
    console.log('✅ Mochia claims set');
    
    await admin.auth().setCustomUserClaims(uids.office, { admin: true });
    console.log('✅ Office admin claims set');
    
    console.log('\n🎉 All custom claims set successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setClaims();
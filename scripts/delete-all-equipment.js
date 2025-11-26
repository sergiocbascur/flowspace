/**
 * Script para eliminar todos los equipos antiguos de la tabla equipment
 * Ejecutar con: node scripts/delete-all-equipment.js
 */

import { pool } from '../backend/db/connection.js';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function deleteAllEquipment() {
    try {
        console.log('⚠️  ADVERTENCIA: Este script eliminará TODOS los equipos de la base de datos.');
        console.log('   - Se eliminarán todos los equipos de la tabla "equipment"');
        console.log('   - Se eliminarán todos los logs asociados de "equipment_logs"');
        console.log('   - Esta acción NO se puede deshacer');
        console.log();

        const confirm1 = await question('¿Estás seguro? Escribe "ELIMINAR TODO" para confirmar: ');
        
        if (confirm1 !== 'ELIMINAR TODO') {
            console.log('❌ Confirmación incorrecta. Operación cancelada.');
            rl.close();
            return;
        }

        console.log();
        const confirm2 = await question('Última confirmación. Escribe "SI, ELIMINAR" para proceder: ');
        
        if (confirm2 !== 'SI, ELIMINAR') {
            console.log('❌ Confirmación incorrecta. Operación cancelada.');
            rl.close();
            return;
        }

        console.log('\n🗑️  Eliminando equipos...');

        const client = await pool.connect();

        try {
            // Primero contar cuántos equipos hay
            const countResult = await client.query('SELECT COUNT(*) as count FROM equipment');
            const equipmentCount = parseInt(countResult.rows[0].count);
            console.log(`   📊 Equipos encontrados: ${equipmentCount}`);

            if (equipmentCount === 0) {
                console.log('   ℹ️  No hay equipos para eliminar.');
                rl.close();
                return;
            }

            // Contar logs
            const logsCountResult = await client.query('SELECT COUNT(*) as count FROM equipment_logs');
            const logsCount = parseInt(logsCountResult.rows[0].count);
            console.log(`   📊 Logs encontrados: ${logsCount}`);

            // Eliminar logs primero (por foreign key)
            console.log('   🗑️  Eliminando logs...');
            await client.query('DELETE FROM equipment_logs');
            console.log(`   ✅ ${logsCount} logs eliminados`);

            // Eliminar códigos temporales
            console.log('   🗑️  Eliminando códigos temporales...');
            const tempCodesResult = await client.query('DELETE FROM equipment_temp_codes RETURNING id');
            console.log(`   ✅ ${tempCodesResult.rows.length} códigos temporales eliminados`);

            // Eliminar equipos
            console.log('   🗑️  Eliminando equipos...');
            const equipmentResult = await client.query('DELETE FROM equipment RETURNING id');
            console.log(`   ✅ ${equipmentResult.rows.length} equipos eliminados`);

            // Commit
            await client.query('COMMIT');

            console.log('\n✅ ¡Eliminación completada exitosamente!');
            console.log(`   - ${equipmentResult.rows.length} equipos eliminados`);
            console.log(`   - ${logsCount} logs eliminados`);
            console.log(`   - ${tempCodesResult.rows.length} códigos temporales eliminados`);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
            rl.close();
        }

    } catch (error) {
        console.error('\n❌ Error eliminando equipos:', error);
        process.exit(1);
    }
}

deleteAllEquipment();


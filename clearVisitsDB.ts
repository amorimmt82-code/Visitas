// Script para limpar todos os registros de visitas do sistema
// Execute este arquivo no navegador (por exemplo, usando um botão ou importando em uma página)

export function clearVisitsDB() {
  localStorage.removeItem('melro_visits_db');
  alert('Registros de visitas removidos com sucesso!');
}

// Se quiser rodar manualmente:
// clearVisitsDB();

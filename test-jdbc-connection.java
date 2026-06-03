// Тестовый класс для проверки JDBC подключения
// Запустите: javac -cp ".:/path/to/postgresql.jar" test-jdbc-connection.java
// java -cp ".:/path/to/postgresql.jar" test-jdbc-connection

import java.sql.Connection;
import java.sql.DriverManager;

public class test-jdbc-connection {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://127.0.0.1:5432/task_app";
        String user = "postgres";
        String password = "0000";
        
        try {
            Connection conn = DriverManager.getConnection(url, user, password);
            System.out.println("✅ Подключение успешно!");
            conn.close();
        } catch (Exception e) {
            System.out.println("❌ Ошибка подключения: " + e.getMessage());
            e.printStackTrace();
        }
    }
}


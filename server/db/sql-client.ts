/**
 * HealthMesh - Azure SQL Database Client
 * Connects to Azure SQL Database for persistent storage
 */

import sql from 'mssql';

interface SQLConfig {
  server: string;
  database: string;
  user: string;
  password: string;
  port: number;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
    enableArithAbort: boolean;
  };
  pool: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
  };
}

export class AzureSQLClient {
  private static instance: AzureSQLClient;
  private pool: sql.ConnectionPool | null = null;
  private config: SQLConfig;

  private constructor() {
    // Parse connection string from environment
    const connString = process.env.AZURE_SQL_CONNECTION_STRING || '';
    
    if (!connString) {
      throw new Error('AZURE_SQL_CONNECTION_STRING not configured in .env');
    }

    // Parse Azure SQL connection string
    const parsed = this.parseConnectionString(connString);
    
    this.config = {
      server: parsed.server,
      database: parsed.database,
      user: parsed.user,
      password: parsed.password,
      port: 1433,
      options: {
        encrypt: true, // Required for Azure SQL
        trustServerCertificate: false,
        enableArithAbort: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  private parseConnectionString(connString: string): {
    server: string;
    database: string;
    user: string;
    password: string;
  } {
    // Format: Server=tcp:server.database.windows.net,1433;Initial Catalog=dbname;User ID=username;Password=password;
    const serverMatch = connString.match(/Server=tcp:([^,;]+)/);
    const databaseMatch = connString.match(/Initial Catalog=([^;]+)/);
    const userMatch = connString.match(/User ID=([^;]+)/);
    const passwordMatch = connString.match(/Password=([^;]+)/);

    if (!serverMatch || !databaseMatch || !userMatch || !passwordMatch) {
      throw new Error('Invalid Azure SQL connection string format');
    }

    return {
      server: serverMatch[1],
      database: databaseMatch[1],
      user: userMatch[1],
      password: passwordMatch[1],
    };
  }

  public static getInstance(): AzureSQLClient {
    if (!AzureSQLClient.instance) {
      AzureSQLClient.instance = new AzureSQLClient();
    }
    return AzureSQLClient.instance;
  }

  public async connect(): Promise<void> {
    if (this.pool) {
      return; // Already connected
    }

    try {
      console.log('🔌 Connecting to Azure SQL Database...');
      this.pool = await sql.connect(this.config);
      console.log('✅ Azure SQL Database connected successfully');
    } catch (error) {
      console.error('❌ Azure SQL connection failed:', error);
      throw error;
    }
  }

  public async query<T = any>(queryText: string, params?: any[]): Promise<T[]> {
    if (!this.pool) {
      await this.connect();
    }

    try {
      const request = this.pool!.request();
      
      // Add parameters if provided
      if (params) {
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
      }

      const result = await request.query(queryText);
      return result.recordset as T[];
    } catch (error) {
      console.error('SQL Query Error:', error);
      throw error;
    }
  }

  public async execute(queryText: string, params?: Record<string, any>): Promise<any> {
    if (!this.pool) {
      await this.connect();
    }

    try {
      const request = this.pool!.request();
      
      // Add named parameters
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          request.input(key, value);
        });
      }

      return await request.query(queryText);
    } catch (error) {
      console.error('SQL Execute Error:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      console.log('🔌 Azure SQL Database disconnected');
    }
  }

  public isConnected(): boolean {
    return this.pool !== null && this.pool.connected;
  }
}

export const azureSQL = AzureSQLClient.getInstance();

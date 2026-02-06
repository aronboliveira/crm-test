import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import TaskEntity from '../../modules/tasks/task.entity';
import { ProjectEntity } from '../../modules/projects/project.entity';

@Injectable()
export default class TypeOrmMongoDataSourceProvider {
  readonly dataSource: DataSource;
  #ready = false;

  constructor(cfg: ConfigService) {
    try {
      const url =
        cfg.get<string>('MONGODB_URL') ||
        'mongodb://localhost:27017/corp_admin';

      if (!url) {
        console.warn(
          '[TypeOrmMongoDataSourceProvider] No MONGODB_URL, using default',
        );
      }

      this.dataSource = new DataSource({
        type: 'mongodb',
        url,
        entities: [TaskEntity, ProjectEntity],
        synchronize: true,
      } as any);

      console.log('[TypeOrmMongoDataSourceProvider] DataSource created');
    } catch (e) {
      console.error('[TypeOrmMongoDataSourceProvider] constructor failed:', e);
      throw e;
    }
  }

  async ensureReady(): Promise<DataSource> {
    try {
      if (!this.#ready) {
        console.log(
          '[TypeOrmMongoDataSourceProvider] Initializing DataSource...',
        );
        await this.dataSource.initialize();
        this.#ready = true;
        console.log('[TypeOrmMongoDataSourceProvider] DataSource initialized');
      }
      return this.dataSource;
    } catch (e) {
      console.error('[TypeOrmMongoDataSourceProvider] ensureReady failed:', e);
      throw e;
    }
  }
}

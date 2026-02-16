import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import TaskEntity from '../../modules/tasks/task.entity';
import { ProjectEntity } from '../../modules/projects/project.entity';

@Injectable()
export default class TypeOrmMongoDataSourceProvider {
  private readonly logger = new Logger(TypeOrmMongoDataSourceProvider.name);
  readonly dataSource: DataSource;
  #ready = false;

  constructor(cfg: ConfigService) {
    try {
      const url =
        cfg.get<string>('MONGODB_URL') ||
        'mongodb://localhost:27017/corp_admin';

      if (!url) {
        this.logger.warn('No MONGODB_URL, using default');
      }

      this.dataSource = new DataSource({
        type: 'mongodb',
        url,
        entities: [TaskEntity, ProjectEntity],
        synchronize: true,
      } as any);

      this.logger.log('DataSource created');
    } catch (e) {
      this.logger.error('Constructor failed', e instanceof Error ? e.stack : e);
      throw e;
    }
  }

  async ensureReady(): Promise<DataSource> {
    try {
      if (!this.#ready) {
        this.logger.log('Initializing DataSource...');
        await this.dataSource.initialize();
        this.#ready = true;
        this.logger.log('DataSource initialized');
      }
      return this.dataSource;
    } catch (e) {
      this.logger.error('ensureReady failed', e instanceof Error ? e.stack : e);
      throw e;
    }
  }
}

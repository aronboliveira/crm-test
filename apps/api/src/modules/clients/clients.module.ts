import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ClientEntity from '../../entities/ClientEntity';
import { AdminClientsController } from './admin-clients.controller';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientEntity])],
  controllers: [ClientsController, AdminClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import UserEntity from '../../entities/UserEntity';
import UserPreferencesEntity from '../../entities/UserPreferencesEntity';
import UsersController from './users.controller';
import UsersService from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserPreferencesEntity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export default class UsersModule {}

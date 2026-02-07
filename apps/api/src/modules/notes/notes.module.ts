import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import NoteEntity from '../../entities/NoteEntity';
import NotesController from './notes.controller';
import NotesService from './notes.service';

@Module({
  imports: [TypeOrmModule.forFeature([NoteEntity])],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export default class NotesModule {}

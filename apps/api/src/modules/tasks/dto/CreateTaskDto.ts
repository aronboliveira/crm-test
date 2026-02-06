import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

type DecoratorFactory<TArgs extends unknown[] = []> = (
  ...args: TArgs
) => PropertyDecorator;

const IsStringSafe = IsString as DecoratorFactory<[unknown?]>;
const MinLengthSafe = MinLength as DecoratorFactory<[number, unknown?]>;
const IsOptionalSafe = IsOptional as DecoratorFactory<[unknown?]>;
const IsIntSafe = IsInt as DecoratorFactory<[unknown?]>;
const MinSafe = Min as DecoratorFactory<[number, unknown?]>;
const MaxSafe = Max as DecoratorFactory<[number, unknown?]>;

export default class CreateTaskDto {
  @IsStringSafe()
  @MinLengthSafe(1)
  projectId!: string;

  @IsStringSafe()
  @MinLengthSafe(3)
  title!: string;

  @IsOptionalSafe()
  @IsStringSafe()
  description?: string;

  @IsIntSafe()
  @MinSafe(1)
  @MaxSafe(5)
  priority!: number;
}

import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetVideosQueryDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsIn(['pending', 'processing', 'completed', 'failed'])
  status?: 'pending' | 'processing' | 'completed' | 'failed';

  getWithDefaults(): { page: number; limit: number; status?: string } {
    return {
      page: this.page ?? 1,
      limit: this.limit ?? 10,
      status: this.status,
    };
  }

  getSkip(): number {
    const page = this.page ?? 1;
    const limit = this.limit ?? 10;
    return (page - 1) * limit;
  }
}

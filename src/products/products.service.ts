import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('ProductService')

  onModuleInit() {
    this.$connect();
    this.logger.log(`Databases connected`);
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    const totalPages = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(totalPages / limit);

    return {
      data: await this.product.findMany({
        skip: (page - 1) * paginationDto.limit,
        take: limit,
        where: {
          available: true
        }
      }),
      meta: {
        total: totalPages,
        page,
        lastPage
      }
    }
  }

  async findOne(id: number) {
    const product = await this.product.findUnique({
      where: { id, AND: { available: true } }
    });
    if (!product) throw new RpcException({
      message: `Product with ${id} not found`,
      status: HttpStatus.BAD_REQUEST
    });
    return product
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: __, ...data } = updateProductDto
    await this.findOne(id);
    return this.product.update({
      where: { id },
      data
    })
  }

  async remove(id: number) {
    await this.findOne(id);
    const product = await this.product.update({
      where: { id },
      data: {
        available: false
      }
    });
    return product
  }

  async validateProducts(ids: number[]) {
    ids = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: {
        id: {
          in: ids
        }
      }
    })

    if(products.length !== ids.length) {
      throw new RpcException({
        message: 'Some products were not found',
        status: HttpStatus.BAD_REQUEST
      });
    };

    return products;
  }
}

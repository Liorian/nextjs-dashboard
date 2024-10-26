// 使用 'use server' 声明，指示这是一个在服务器端运行的函数
'use server';

// 引入必要的模块
import {z} from 'zod'; // 用于数据验证和解析
import {sql} from '@vercel/postgres'; // 用于执行 SQL 查询
import {revalidatePath} from 'next/cache'; // 用于重新验证 Next.js 应用程序的路由缓存
import {redirect} from 'next/navigation'; // 用于导航重定向

// 定义表单数据验证架构，包括ID、客户ID、金额、状态和日期
const FormSchema = z.object({
    id: z.string(), // 订单ID
    customerId: z.string(), // 客户ID
    amount: z.coerce.number(), // 金额（自动类型转换）
    status: z.enum(['pending', 'paid']), // 订单状态：待处理或已支付
    date: z.string(), // 日期
});

// 从 FormSchema 中移除 id 和 date 字段，创建一个新的验证对象
const CreateInvoice = FormSchema.omit({id: true, date: true});

// 定义异步函数 createInvoice，用于处理表单数据并创建发票
export async function createInvoice(formData: FormData) {
    // 解析并验证从表单获取的数据
    const {customerId, amount, status} = CreateInvoice.parse({
        customerId: formData.get('customerId'), // 获取客户ID
        amount: formData.get('amount'), // 获取金额
        status: formData.get('status'), // 获取订单状态
    });

    // 将金额转换为美分，以便存储
    const amountInCents = amount * 100;

    // 获取当前日期，并格式化为 YYYY-MM-DD 格式
    const date = new Date().toISOString().split('T')[0];

    // 执行 SQL 插入语句，将发票信息保存到数据库中
    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }
    // 通知Next.js重新验证'/dashboard/invoices'路径的缓存
    revalidatePath('/dashboard/invoices');

    // 在创建发票后，重定向用户到'/dashboard/invoices'页面
    redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({id: true, date: true});

export async function updateInvoice(id: string, formData: FormData) {
    // 解析并验证从表单获取的数据
    const {customerId, amount, status} = CreateInvoice.parse({
        customerId: formData.get('customerId'), // 获取客户ID
        amount: formData.get('amount'), // 获取金额
        status: formData.get('status'), // 获取订单状态
    });
    const amountInCents = amount * 100;

    try {
        await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
    } catch (error) {
        return {message: 'Database Error: Failed to Update Invoice.'};
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    throw new Error('Failed to Delete Invoice');

    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices');
    } catch (error) {
        return {message: 'Database Error: Failed to Delete Invoice.'};
    }
}

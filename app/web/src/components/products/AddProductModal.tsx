'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';

const schema = z.object({
  name: z.string().min(1, 'Введите название продукта'),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  serving_g: z.coerce.number().positive('Укажите корректный вес').default(100),
  calories: z.coerce.number().nonnegative().optional(),
  protein: z.coerce.number().nonnegative().optional(),
  fat: z.coerce.number().nonnegative().optional(),
  carbs: z.coerce.number().nonnegative().optional(),
  fiber: z.coerce.number().nonnegative().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddProductModalProps {
  onAdd: (data: FormValues) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefillBarcode?: string;
}

export default function AddProductModal({ onAdd, open: openProp, onOpenChange, prefillBarcode }: AddProductModalProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      brand: '',
      barcode: prefillBarcode ?? '',
      category: '',
      serving_g: 100,
      calories: undefined,
      protein: undefined,
      fat: undefined,
      carbs: undefined,
      fiber: undefined,
    },
  });

  // Когда модалка открывается с prefillBarcode — подставляем штрихкод в форму
  useEffect(() => {
    if (open && prefillBarcode) {
      form.setValue('barcode', prefillBarcode);
    }
  }, [open, prefillBarcode, form]);

  const onSubmit = async (values: FormValues) => {
    await onAdd(values);
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить вручную
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Добавить продукт</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {/* Название */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Название *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Гречневая крупа"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Бренд */}
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Бренд</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Мистраль"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Категория + Штрихкод в ряд */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Категория</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white rounded-xl">
                          <SelectValue placeholder="Выбрать" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <SelectItem
                            key={cat.value}
                            value={cat.value}
                            className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
                          >
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serving_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Порция (г)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="100"
                        className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* КБЖУ на 100г */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">КБЖУ на 100 г</p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { name: 'calories', label: 'Калории (ккал)', placeholder: '340' },
                    { name: 'protein',  label: 'Белки (г)',       placeholder: '12' },
                    { name: 'fat',      label: 'Жиры (г)',        placeholder: '3' },
                    { name: 'carbs',    label: 'Углеводы (г)',    placeholder: '65' },
                    { name: 'fiber',    label: 'Клетчатка (г)',   placeholder: '2' },
                  ] as const
                ).map(({ name, label, placeholder }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-400 text-xs">{label}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            step="0.1"
                            placeholder={placeholder}
                            className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Штрихкод (опционально) */}
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Штрихкод (необязательно)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="4607035390012"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl"
            >
              {form.formState.isSubmitting ? 'Сохранение...' : 'Добавить продукт'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

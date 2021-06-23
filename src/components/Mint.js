import React, { useEffect, useState } from 'react';
import BN from 'bn.js';
import { GAS, contractId, marketId, parseNearAmount } from '../state/near';
import { get, set, del, ab2str, str2ab } from '../utils/storage';
import { loadCodeFromSrc, getParams } from '../state/code';
import { loadMint, getTokensForSeries } from '../state/views';
import { setDialog, getFrameMedia, uploadMedia, getMediaUrl } from '../state/app';
import { Menu } from './Menu';
import { Params } from './Params';
import { Frame } from './Page';

const PENDING_IMAGE_UPLOAD = '__PENDING_IMAGE_UPLOAD__';

export const Mint = ({ app, path, views, update, dispatch, account, wallet }) => {

	const { mintMenu, image } = app;
	const { mint: item } = views;

	const [state, setState] = useState({ args: {} });

	const seriesName = decodeURIComponent(path.matchAll(/\/mint\/(.+)/gi).next()?.value[1]);

	useEffect(() => {
		dispatch(loadMint(seriesName));
		checkPendingImageUpload();
		return () => {
			const iframe = document.querySelector('iframe');
			if (iframe) iframe.src = '';
		};
	}, []);

	useEffect(() => {
		if (!item) return;
		const { params: { mint } } = getParams(item.src);
		const args = {};
		Object.entries(mint).forEach(([key, val], i) => args[key] = JSON.stringify(val.default));
		setState({ ...state, args });
	}, [item]);

	const checkPendingImageUpload = async () => {
		if (!account) return;
		const { accountId: account_id } = account;
		const data = get(PENDING_IMAGE_UPLOAD + account.accountId);
		if (data && data.image && data.image.length) {
			/// find last token by owner
			const numTokens = await account.viewFunction(contractId, 'nft_supply_for_owner', {
				account_id,
			});
			const token = (await account.viewFunction(contractId, 'nft_tokens_for_owner', {
				account_id,
				from_index: (parseInt(numTokens, 10) - 1).toString(),
				limit: 1,
			}))[0];
			// decode and upload image
			const image = str2ab(data.image);
			const response = await uploadMedia({ account, image, token });
			console.log(response);
			del(PENDING_IMAGE_UPLOAD + account.accountId);
		}
	};

	const handleImage = async () => {
		if (!image) return;
		set(PENDING_IMAGE_UPLOAD + account.accountId, { image: ab2str(image) });

		/// debugging image rendering from canvas
		// const image2 = str2ab(get(PENDING_IMAGE_UPLOAD + account.accountId).image);
		// const sample = document.createElement('img')
		// sample.src = URL.createObjectURL(new Blob([new Uint8Array(image2)]));
		// document.body.appendChild(sample)

		try {
			const { series } = item;
			const { args } = state;
			if (series.claimed === series.params.max_supply) {
				throw 'None left of this series';
			}
			if (!item?.conditions?.near) {
				throw 'Not for sale';
			}
			const mint = Object.values(args);
			const owner = Object.values(getParams(series.src).params.owner).map((p) => JSON.stringify(p.default));
			if (series.params.mint.length && !mint.length) {
				throw 'Choose some values to make this unique';
			}
			if (series.params.enforce_unique_mint_args) {
				const tokens = await dispatch(getTokensForSeries(series.series_name));
				const exists = tokens.some(({ series_args }) => {
					return series_args.mint.length &&
						(JSON.stringify(series_args.mint) === JSON.stringify(mint));
				});
				if (exists) {
					throw 'A token with these values exists, try another combination';
				}
			}

			account.functionCall(marketId, 'offer', {
				nft_contract_id: contractId,
				token_id: series.series_name,
				msg: JSON.stringify({
					series_name: series.series_name,
					mint,
					owner,
					receiver_id: account.accountId,
					media: getMediaUrl(contractId)
				})
			}, GAS, new BN(parseNearAmount('0.1')).add(new BN(item.conditions.near)));
		} catch (e) {
			console.warn(e);
			del(PENDING_IMAGE_UPLOAD + account.accountId);
			return dispatch(setDialog({
				msg: e,
				info: true
			}));
		}
	};
	useEffect(handleImage, [image]);

	const handleOffer = async () => {
		dispatch(getFrameMedia(item.id)); // -> handleImage
	};

	const updateArgs = (name, value) => {
		if (!value.length) return;
		const newArgs = { ...args, [name]: value };
		setState({ args: newArgs });
		let newCode = item.series.src;
		Object.entries(newArgs).forEach(([k, v]) => newCode = newCode.replace(new RegExp(`{{\\s\*${k}\\s\*}}`, 'g'), v));
		dispatch(loadCodeFromSrc({
			id: item.series.series_name, src: newCode, owner_id: item.owner_id
		}));
	};

	let mintMenuOptions = {};
	const params = [];
	if (item) {

		Object.entries(getParams(item.series.src).params.mint).forEach(([k, v]) => {
			params.push({
				name: k,
				init: v.default,
				type: v.type
			});
		});

		item.series.params.enforce_unique_mint_args;


		mintMenuOptions = {
			[item.series.series_name]: {
				frag: <>
					{ item.series.params.mint.length && <>
						<div>
							Mint a variant of the series by choosing: {item.series.params.mint.join()}.
						</div>
						{ item.series.params.enforce_unique_mint_args &&
							<div>
								Mint values must be unique from other tokens minted.
							</div>
						}
					</>
					}

					{ item.series.params.owner.length && <>
						<div>
							Once you are an owner, you can update the following: {item.series.params.owner.join()}.
						</div>
						{ item.series.params.enforce_unique_owner_args &&
							<div>
								The owner values must be unique from other tokens.
							</div>
						}
					</>
					}

					<div>Total supply of {item.series.params.max_supply}.</div>
					<div>
						Minting asks for more than list price to pay storage of your unique arguments on chain. You will be refunded any unused NEAR.
					</div>
				</>
			}
		};
	} else {
		return null;
	}

	const { args } = state;

	return <>
		<div className="mint">
			<div className="menu no-barcode">
				<div className="bar">
					{account
						?
						<>
							<div onClick={() => update('app.mintMenu', mintMenu === 'left' ? false : 'left')}><span>About</span></div>
							<div onClick={() => handleOffer()}><span>Mint</span></div>
						</>
						:
						<>
							<div onClick={() => history.push('/')}>
								<span>Back</span>
							</div>
							<div onClick={() => wallet.signIn()}>
								<span>Sign In to Mint</span>
							</div>
						</>
					}
				</div>
				{
					mintMenu === 'left' && <div className="sub below">
						<Menu {...{
							app, menuKey: 'mintMenu', update, options: mintMenuOptions
						}} />
					</div>
				}
			</div>

			<div className="gallery">
				<Frame {...{ dispatch, items: [item], menu: 'onlyTop' }} />
			</div>

			<div className="mint-params">
				<Params {...{ params, args, updateArgs }} />
			</div>
		</div>

	</>;
};

